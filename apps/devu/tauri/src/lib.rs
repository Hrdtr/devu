use std::net::TcpListener;
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager, State};
use tauri_plugin_shell::ShellExt;
use tokio::time::sleep;

// Structure to manage the sidecar process
struct SidecarManager {
    port: Option<u16>,
    is_running: bool,
}

impl SidecarManager {
    fn new() -> Self {
        SidecarManager {
            port: None,
            is_running: false,
        }
    }
}

// Define as a Tauri state
struct SidecarState(Arc<Mutex<SidecarManager>>);

// Start the sidecar API server and return the port it's running on
async fn start_sidecar(app: AppHandle) -> Result<u16, String> {
    let available_port =
        get_available_port().ok_or_else(|| "Failed to find available port".to_string())?;

    println!("Attempting to spawn sidecar on port {}", available_port);
    match app
        .shell()
        .sidecar("devu-api")
        .expect("failed to create sidecar command")
        .args(["-p", &available_port.to_string()])
        .spawn()
    {
        Ok(_child) => {
            // Wait a moment for the server to start
            sleep(Duration::from_millis(500)).await;
            println!("Sidecar spawned successfully.");
            Ok(available_port)
        }
        Err(e) => {
            eprintln!("Failed to spawn sidecar: {}", e);
            Err(format!("Failed to start sidecar: {}", e))
        }
    }
}

// Function to continuously manage the sidecar lifecycle (start and retry)
// This task will run in the background and ensure the sidecar is running.
async fn manage_sidecar_lifecycle(app: AppHandle, sidecar_state: Arc<Mutex<SidecarManager>>) {
    loop {
        // Check if the sidecar is currently marked as running
        let is_running = { sidecar_state.lock().unwrap().is_running };

        if !is_running {
            // If not running, attempt to start it
            println!("Sidecar is not running, attempting to start...");
            match start_sidecar(app.clone()).await {
                Ok(port) => {
                    // Update state on successful start
                    {
                        let mut manager = sidecar_state.lock().unwrap();
                        manager.port = Some(port);
                        manager.is_running = true;
                    }

                    // Emit event to frontend with the port
                    if let Err(e) = app.emit("sidecar-port-available", port.to_string()) {
                        eprintln!("Failed to emit sidecar-port event: {}", e);
                    }
                    println!("Sidecar started successfully on port {}", port);
                }
                Err(e) => {
                    // Handle start failure
                    eprintln!("Failed to start sidecar: {}", e);
                    // Ensure state reflects failure (is_running should already be false)
                    {
                        let mut manager = sidecar_state.lock().unwrap();
                        manager.is_running = false;
                        manager.port = None; // Clear the old port
                    }

                    // Emit error event
                    if let Err(e) = app.emit("sidecar-error", e.clone()) {
                        eprintln!("Failed to emit sidecar-error event: {}", e);
                    }

                    // Wait before retrying the start attempt
                    println!("Retrying sidecar start in 10 seconds...");
                    sleep(Duration::from_secs(10)).await;
                }
            }
        } else {
            // Sidecar is running, just wait a bit before checking the state again.
            // The health check loop is responsible for detecting if it goes down.
            sleep(Duration::from_secs(5)).await;
        }
    }
}

// Health check function that periodically checks if the sidecar is alive
// This task runs independently and updates the state if the sidecar fails.
async fn health_check_loop(sidecar_state: Arc<Mutex<SidecarManager>>) {
    let client = reqwest::Client::new();

    loop {
        // Check every 5 seconds
        sleep(Duration::from_secs(5)).await;

        let port = {
            let manager = sidecar_state.lock().unwrap();
            // Only perform health check if sidecar is marked as running and port is known
            if !manager.is_running || manager.port.is_none() {
                continue; // Skip health check if not running or port unknown
            }
            manager.port.unwrap()
        };

        let url = format!("http://127.0.0.1:{}/ping", port);

        match client
            .get(&url)
            .timeout(Duration::from_secs(2))
            .send()
            .await
        {
            Ok(response) if response.status().is_success() => {
                // Sidecar is alive, continue monitoring
                // println!("Sidecar health check successful."); // Optional: log success
            }
            _ => {
                // Sidecar is down or health check failed, update state
                println!("Sidecar health check failed, marking as down.");
                let mut manager = sidecar_state.lock().unwrap();
                manager.is_running = false; // This will trigger the lifecycle manager to restart
                manager.port = None; // Clear the old port
                                     // The manage_sidecar_lifecycle task will detect this state change and attempt a restart.
            }
        }
    }
}

// Helper function to get an available port
fn get_available_port() -> Option<u16> {
    // Start searching from a higher range to avoid common ports
    (49152..65535).find(|port| port_is_available(*port))
}

// Helper function to check if a port is available
fn port_is_available(port: u16) -> bool {
    // Binding to 127.0.0.1 checks availability on the local loopback interface
    match TcpListener::bind(("127.0.0.1", port)) {
        Ok(listener) => {
            // Drop the listener immediately to free the port
            drop(listener);
            true
        }
        Err(_) => false,
    }
}

// Command to manually request the current sidecar port
#[tauri::command]
fn get_sidecar_port(state: State<'_, SidecarState>) -> Result<String, String> {
    let manager = state.0.lock().unwrap();
    if manager.is_running && manager.port.is_some() {
        Ok(manager.port.unwrap().to_string())
    } else {
        Err("Sidecar is not running or port is not available".to_string())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize the shared state for the sidecar manager
    let sidecar_state = Arc::new(Mutex::new(SidecarManager::new()));

    tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        // Manage the sidecar state so it can be accessed by commands and tasks
        .manage(SidecarState(sidecar_state.clone()))
        .setup(|app| {
            // Get the app handle to interact with the Tauri environment
            let app_handle = app.handle();

            // Clone the shared state for use in the async tasks
            let sidecar_manager = app.state::<SidecarState>().0.clone();

            // Spawn the sidecar lifecycle manager task
            // This task will handle the initial start and subsequent retries
            let app_handle_clone = app_handle.clone();
            let state_clone = sidecar_manager.clone();
            tauri::async_runtime::spawn(async move {
                manage_sidecar_lifecycle(app_handle_clone, state_clone).await;
            });

            // Spawn the health check loop task
            // This task will monitor a running sidecar and update the state if it fails
            let state_clone = sidecar_manager.clone();
            tauri::async_runtime::spawn(async move {
                health_check_loop(state_clone).await;
            });

            Ok(())
        })
        // Register the command to get the sidecar port from the frontend
        .invoke_handler(tauri::generate_handler![get_sidecar_port])
        .run(tauri::generate_context!())
        .expect("error while running application");
}
