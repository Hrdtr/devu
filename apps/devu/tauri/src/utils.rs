use std::net::{TcpListener, UdpSocket};
use std::time::Duration;

// Helper function to get an available port
pub fn get_available_port() -> Option<u16> {
    // Start searching from a higher range to avoid common ports
    // Use a wider range and skip commonly problematic ports
    for port in 49152..65535 {
        // Skip ports that are commonly used or reserved
        if is_commonly_used_port(port) {
            continue;
        }

        if port_is_available(port) {
            return Some(port);
        }
    }
    None
}

// Helper function to check if a port is commonly used or should be avoided
fn is_commonly_used_port(port: u16) -> bool {
    match port {
        // Windows dynamic/ephemeral port range (varies by Windows version)
        49152..=65535 => {
            // For Windows 10/11, be more selective within this range
            // Skip the first few hundred ports which are most commonly allocated dynamic ports
            match port {
                49152..=49500 => true, // Most commonly allocated dynamic ports
                _ => false,
            }
        }
        _ => false,
    }
}

// Helper function to check if a port is available
fn port_is_available(port: u16) -> bool {
    // Check TCP port availability
    let tcp_available = match TcpListener::bind(("127.0.0.1", port)) {
        Ok(listener) => {
            // Set SO_REUSEADDR to avoid TIME_WAIT issues
            if let Err(_) = listener.set_nonblocking(true) {
                return false;
            }
            drop(listener);

            // Double-check by trying to connect
            match std::net::TcpStream::connect_timeout(
                &format!("127.0.0.1:{}", port).parse().unwrap(),
                Duration::from_millis(100),
            ) {
                Ok(_) => false, // Connection succeeded, port is in use
                Err(_) => true, // Connection failed, port is available
            }
        }
        Err(_) => false,
    };

    if !tcp_available {
        return false;
    }

    // Also check UDP port availability to be thorough
    let udp_available = match UdpSocket::bind(("127.0.0.1", port)) {
        Ok(socket) => {
            drop(socket);
            true
        }
        Err(_) => false,
    };

    tcp_available && udp_available
}
