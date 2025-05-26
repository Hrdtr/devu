use crate::service_manager::{APIServiceState, ServiceManager};
use crate::utils::get_available_port;
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::{path::BaseDirectory, AppHandle, Emitter, Manager, State};
use tauri_plugin_shell::process::CommandEvent;
use tauri_plugin_shell::ShellExt;
use tokio::time::sleep;

// Start the API server and return the port it's running on
pub async fn start_api_service(
    app: AppHandle,
    api_service_state: Arc<Mutex<ServiceManager>>,
) -> Result<u16, String> {
    // First, ensure no existing process is running
    {
        let mut manager = api_service_state.lock().unwrap();
        manager.kill_process();
    }

    let resources_path_buf = app
        .path()
        .resolve("resources/api", BaseDirectory::Resource)
        .expect("Failed to resolve API resources");
    // Convert to a string and apply `dunce::canonicalize`, or use it directly on the PathBuf if supported.
    // Without canonicalization, Windows paths may include a \\?\ prefix (e.g., \\?\C:\...),
    // which bun fails to resolve correctly.
    let resources_path = dunce::canonicalize(&resources_path_buf)
        .unwrap_or_else(|_| resources_path_buf.clone()) // Fallback to original if dunce fails
        .to_str()
        .expect("Failed to convert API resources path to string")
        .to_string();

    let available_port =
        get_available_port().ok_or_else(|| "Failed to find available port".to_string())?;

    let data_dir_buf = app
        .path()
        .app_data_dir()
        .expect("Failed to resolve app-data-dir");
    let data_dir = dunce::canonicalize(&data_dir_buf)
        .unwrap_or_else(|_| data_dir_buf.clone())
        .to_str()
        .expect("Failed to convert data dir to string")
        .to_string();

    println!("Attempting to spawn API service on port {}", available_port);
    let command = app
        .shell()
        .sidecar("devu-bun")
        .expect("Failed to initialize API service start command")
        .args([
            "run",
            &resources_path,
            "--port",
            &available_port.to_string(),
            "--app-resources-path",
            &resources_path,
            "--app-data-dir",
            &data_dir,
        ]);

    match command.spawn() {
        Ok((mut rx, child)) => {
            // Store the child process for later cleanup
            {
                let mut manager = api_service_state.lock().unwrap();
                manager.child_process = Some(child);
            }
            // Clone the state for the output handling task
            let api_state_clone = api_service_state.clone();
            // Spawn a task to handle the API service's output
            tauri::async_runtime::spawn(async move {
                while let Some(event) = rx.recv().await {
                    match event {
                        CommandEvent::Stdout(line) => match String::from_utf8(line) {
                            Ok(text) => print!("[API::stdout] {}", text),
                            Err(e) => eprint!("[API::stdout] {:?}", e),
                        },
                        CommandEvent::Stderr(line) => match String::from_utf8(line) {
                            Ok(text) => eprint!("[API::stderr] {}", text),
                            Err(e) => eprint!("[API::stderr] {:?}", e),
                        },
                        CommandEvent::Error(err) => {
                            eprint!("[API::error] {:?}", err);
                            // Mark as not running when there's an error
                            let mut manager = api_state_clone.lock().unwrap();
                            manager.is_running = false;
                            manager.port = None;
                            manager.child_process = None;
                        }
                        CommandEvent::Terminated(payload) => {
                            print!("[API::terminated] Exit code: {:?}", payload.code);
                            // Mark as not running when terminated
                            let mut manager = api_state_clone.lock().unwrap();
                            manager.is_running = false;
                            manager.port = None;
                            manager.child_process = None;
                        }
                        _ => {}
                    }
                }
            });
            // Wait a moment for the server to start
            sleep(Duration::from_millis(500)).await;
            println!("API service spawned successfully.");
            Ok(available_port)
        }
        Err(e) => {
            eprintln!("Failed to spawn API service: {}", e);
            Err(format!("Failed to spawn API service: {}", e))
        }
    }
}

// Function to continuously manage the API service lifecycle (start and retry)
// This task will run in the background and ensure the service is running.
pub async fn manage_api_service_lifecycle(
    app: AppHandle,
    api_service_state: Arc<Mutex<ServiceManager>>,
) {
    loop {
        // Check if the service is currently marked as running
        let is_running = { api_service_state.lock().unwrap().is_running };

        if !is_running {
            // If not running, attempt to start it
            println!("API service is not running, attempting to start...");
            match start_api_service(app.clone(), api_service_state.clone()).await {
                Ok(port) => {
                    // Update state on successful start
                    {
                        let mut manager = api_service_state.lock().unwrap();
                        manager.port = Some(port);
                        manager.is_running = true;
                    }

                    // Emit event to frontend with the port
                    if let Err(e) = app.emit("api-service-port-available", port.to_string()) {
                        eprintln!("Failed to emit api-service-port-available event: {}", e);
                    }
                    println!("API service started successfully on port {}", port);
                }
                Err(e) => {
                    // Handle start failure
                    eprintln!("Failed to start API service: {}", e);
                    // Ensure state reflects failure (is_running should already be false)
                    {
                        let mut manager = api_service_state.lock().unwrap();
                        manager.is_running = false;
                        manager.port = None;
                        manager.child_process = None;
                    }

                    // Emit error event
                    if let Err(e) = app.emit("api-service-error", e.clone()) {
                        eprintln!("Failed to emit api-service-error event: {}", e);
                    }

                    // Wait before retrying the start attempt
                    println!("Retrying API service start in 10 seconds...");
                    sleep(Duration::from_secs(10)).await;
                }
            }
        } else {
            // API service is running, just wait a bit before checking the state again.
            // The health check loop is responsible for detecting if it goes down.
            sleep(Duration::from_secs(5)).await;
        }
    }
}

// Health check function that periodically checks if the API service is alive
// This task runs independently and updates the state if the API service fails.
pub async fn api_service_health_check_loop(api_service_state: Arc<Mutex<ServiceManager>>) {
    let client = reqwest::Client::new();

    loop {
        // Check every 5 seconds
        sleep(Duration::from_secs(5)).await;

        let port = {
            let manager = api_service_state.lock().unwrap();
            // Only perform health check if API service is marked as running and port is known
            if !manager.is_running || manager.port.is_none() {
                continue; // Skip health check if not running or port unknown
            }
            manager.port.unwrap()
        };

        let url = format!("http://127.0.0.1:{}/", port);

        match client
            .get(&url)
            .timeout(Duration::from_secs(2))
            .send()
            .await
        {
            Ok(response) if response.status().is_success() => {
                // API service is alive, continue monitoring
                // println!("API service health check successful."); // Optional: log success
            }
            _ => {
                // API Service is down or health check failed, update state
                println!("API Service health check failed, marking as down.");
                let mut manager = api_service_state.lock().unwrap();
                manager.is_running = false; // This will trigger the lifecycle manager to restart
                manager.port = None; // Clear the old port
                manager.child_process = None; // Clear the process handle
                                              // The manage_api_service_lifecycle task will detect this state change and attempt a restart.
            }
        }
    }
}

// Command to manually request the current API service port
#[tauri::command]
pub fn get_api_service_port(state: State<'_, APIServiceState>) -> Result<String, String> {
    let manager = state.0.lock().unwrap();
    if manager.is_running && manager.port.is_some() {
        Ok(manager.port.unwrap().to_string())
    } else {
        Err("API Service is not running or port is not available".to_string())
    }
}
