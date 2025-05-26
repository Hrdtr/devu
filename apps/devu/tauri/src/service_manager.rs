use std::sync::{Arc, Mutex};
use tauri_plugin_shell::process::CommandChild;

// Structure to manage the sidecar service process
pub struct ServiceManager {
    pub port: Option<u16>,
    pub is_running: bool,
    pub child_process: Option<CommandChild>,
}

impl ServiceManager {
    pub fn new() -> Self {
        ServiceManager {
            port: None,
            is_running: false,
            child_process: None,
        }
    }

    // Kill the current process if it exists
    pub fn kill_process(&mut self) {
        if let Some(child) = self.child_process.take() {
            println!("Terminating existing service process...");
            if let Err(e) = child.kill() {
                eprintln!("Failed to kill service process: {}", e);
            } else {
                println!("Service process terminated successfully.");
            }
        }
        self.is_running = false;
        self.port = None;
    }
}

// Define as a Tauri state
pub struct APIServiceState(pub Arc<Mutex<ServiceManager>>);
