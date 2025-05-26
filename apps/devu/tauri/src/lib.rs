use std::sync::{Arc, Mutex};
use tauri::{Manager, RunEvent};

mod api_service;
mod service_manager;
mod utils;

use api_service::{
    api_service_health_check_loop, get_api_service_port, manage_api_service_lifecycle,
};
use service_manager::{APIServiceState, ServiceManager};

// TODO: This is a temporary workaround before graceful shutdown handling is implemented
// See: https://github.com/tauri-apps/tauri/issues/12978
fn cleanup_orphaned_processes() {
    // Try to kill any remaining bun processes that might be our sidecar
    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        let _ = Command::new("pkill").arg("-f").arg("devu-bun").output();
    }
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        let _ = Command::new("taskkill")
            .args(["/F", "/IM", "devu-bun.exe"])
            .output();
    }
    #[cfg(target_os = "linux")]
    {
        use std::process::Command;
        let _ = Command::new("pkill").arg("-f").arg("devu-bun").output();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    cleanup_orphaned_processes(); // https://github.com/tauri-apps/tauri/issues/12978

    // Initialize the shared state for the service manager
    let api_service_state = Arc::new(Mutex::new(ServiceManager::new()));

    let mut builder = tauri::Builder::default();
    #[cfg(desktop)]
    {
        builder = builder
            .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
                let _ = app
                    .get_webview_window("main")
                    .expect("no main window")
                    .set_focus();
            }))
            .plugin(tauri_plugin_autostart::init(
                tauri_plugin_autostart::MacosLauncher::LaunchAgent,
                None,
            ))
            .plugin(tauri_plugin_process::init())
            .plugin(tauri_plugin_updater::Builder::new().build());
    }

    builder
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        // Manage the API service state so it can be accessed by commands and tasks
        .manage(APIServiceState(api_service_state.clone()))
        .setup(|app| {
            // Get the app handle to interact with the Tauri environment
            let app_handle = app.handle();

            // Clone the shared state for use in the async tasks
            let api_service_manager = app.state::<APIServiceState>().0.clone();

            // Spawn the API service lifecycle manager task
            // This task will handle the initial start and subsequent retries
            let app_handle_clone_api_service = app_handle.clone();
            let api_service_state_clone_task = api_service_manager.clone();
            tauri::async_runtime::spawn(async move {
                manage_api_service_lifecycle(
                    app_handle_clone_api_service,
                    api_service_state_clone_task,
                )
                .await;
            });

            // Spawn the health check loop task
            // This task will monitor a running API service and update the state if it fails
            let api_service_state_clone_health_check = api_service_manager.clone();
            tauri::async_runtime::spawn(async move {
                api_service_health_check_loop(api_service_state_clone_health_check).await;
            });

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                // Clean up API service when window is closing
                if let Some(state) = window.try_state::<APIServiceState>() {
                    let mut manager = state.0.lock().unwrap();
                    manager.kill_process();
                    println!("API service cleaned up on window close.");
                }
            }
        })
        // Register the command to stop & get the API service port from the frontend
        .invoke_handler(tauri::generate_handler![get_api_service_port])
        .build(tauri::generate_context!())
        .expect("error while running application")
        .run(|app_handle, event| {
            // Handle global application events
            match event {
                RunEvent::ExitRequested { .. } => {
                    // Clean up API service when the application is about to exit
                    if let Some(state) = app_handle.try_state::<APIServiceState>() {
                        let mut manager = state.0.lock().unwrap();
                        manager.kill_process();
                        println!("API service cleaned up on application exit.");
                    }
                }
                _ => {}
            }
        });
}
