//! Local control endpoint for live TUI coordination.
//!
//! This is intentionally separate from the browser web shell. It exists even
//! while `dif` is still preparing a review, so the `/diff-review` skill can tell
//! the already-running TUI which comparison key it selected.

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread::JoinHandle;

use anyhow::{Result, anyhow};
use serde::Deserialize;
use tiny_http::{Request, Response, Server, StatusCode};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ComparisonUpdate {
    comparison_key: String,
}

/// A local-only control server. Drop (or [`shutdown`](ReviewControl::shutdown))
/// stops its accept loop.
pub struct ReviewControl {
    port: u16,
    server: Arc<Server>,
    handle: Option<JoinHandle<()>>,
    comparison_key: Arc<Mutex<Option<String>>>,
    accepts_updates: Arc<AtomicBool>,
}

impl ReviewControl {
    /// Bind the control server on `port` and start serving requests.
    pub fn start(port: u16) -> Result<Self> {
        let server = Server::http(("127.0.0.1", port))
            .map_err(|e| anyhow!("review control failed to bind port {port}: {e}"))?;
        let server = Arc::new(server);
        let comparison_key = Arc::new(Mutex::new(None));
        let accepts_updates = Arc::new(AtomicBool::new(true));
        let srv = Arc::clone(&server);
        let key = Arc::clone(&comparison_key);
        let accepting = Arc::clone(&accepts_updates);
        let handle = std::thread::spawn(move || serve(&srv, &key, &accepting));
        Ok(Self {
            port,
            server,
            handle: Some(handle),
            comparison_key,
            accepts_updates,
        })
    }

    /// Take a pending comparison key update, if one was posted by the skill.
    #[must_use]
    pub fn take_comparison_key(&self) -> Option<String> {
        self.comparison_key
            .lock()
            .ok()
            .and_then(|mut slot| slot.take())
    }

    /// The URL the skill should POST comparison updates to.
    #[must_use]
    pub fn comparison_url(&self) -> String {
        format!("http://127.0.0.1:{}/comparison", self.port)
    }

    /// Set whether comparison updates should be accepted. The TUI disables
    /// updates once the review is online, because changing comparison then
    /// would invalidate a running difit server and browser shell.
    pub fn set_accepts_updates(&self, accepts_updates: bool) {
        self.accepts_updates
            .store(accepts_updates, Ordering::Relaxed);
    }

    /// The port this server is bound to.
    #[must_use]
    pub const fn port(&self) -> u16 {
        self.port
    }

    /// Stop the server and join its accept thread.
    pub fn shutdown(&mut self) {
        self.server.unblock();
        if let Some(handle) = self.handle.take() {
            let _ = handle.join();
        }
    }
}

impl Drop for ReviewControl {
    fn drop(&mut self) {
        self.shutdown();
    }
}

fn serve(
    server: &Server,
    comparison_key: &Arc<Mutex<Option<String>>>,
    accepts_updates: &Arc<AtomicBool>,
) {
    for request in server.incoming_requests() {
        let key = Arc::clone(comparison_key);
        let accepting = Arc::clone(accepts_updates);
        std::thread::spawn(move || {
            let _ = handle(request, &key, &accepting);
        });
    }
}

fn handle(
    mut request: Request,
    comparison_key: &Mutex<Option<String>>,
    accepts_updates: &AtomicBool,
) -> std::io::Result<()> {
    if request.method().as_str() != "POST" || request.url() != "/comparison" {
        return request.respond(Response::empty(StatusCode(404)));
    }
    if !accepts_updates.load(Ordering::Relaxed) {
        return request.respond(Response::empty(StatusCode(409)));
    }
    let mut body = String::new();
    request.as_reader().read_to_string(&mut body)?;
    let Ok(update) = serde_json::from_str::<ComparisonUpdate>(&body) else {
        return request.respond(Response::empty(StatusCode(400)));
    };
    let key = update.comparison_key.trim();
    if key.is_empty() {
        return request.respond(Response::empty(StatusCode(400)));
    }
    if let Ok(mut slot) = comparison_key.lock() {
        *slot = Some(key.to_owned());
    }
    request.respond(Response::empty(StatusCode(202)))
}

#[cfg(test)]
mod tests {
    use super::ReviewControl;

    fn free_port() -> u16 {
        std::net::TcpListener::bind("127.0.0.1:0")
            .unwrap()
            .local_addr()
            .unwrap()
            .port()
    }

    #[test]
    fn posted_comparison_key_can_be_taken_once() {
        let control = ReviewControl::start(free_port()).unwrap();
        let resp = ureq::post(&control.comparison_url())
            .set("Content-Type", "application/json")
            .send_string(r#"{"comparisonKey":"."}"#)
            .unwrap();
        assert_eq!(resp.status(), 202);
        assert_eq!(control.take_comparison_key().as_deref(), Some("."));
        assert_eq!(control.take_comparison_key(), None);
    }

    #[test]
    fn invalid_payload_is_rejected() {
        let control = ReviewControl::start(free_port()).unwrap();
        let err = ureq::post(&control.comparison_url())
            .send_string(r#"{"comparisonKey":""}"#)
            .unwrap_err();
        let ureq::Error::Status(status, _) = err else {
            panic!("expected HTTP status error");
        };
        assert_eq!(status, 400);
        assert_eq!(control.take_comparison_key(), None);
    }

    #[test]
    fn updates_are_rejected_after_acceptance_is_disabled() {
        let control = ReviewControl::start(free_port()).unwrap();
        control.set_accepts_updates(false);
        let err = ureq::post(&control.comparison_url())
            .set("Content-Type", "application/json")
            .send_string(r#"{"comparisonKey":"."}"#)
            .unwrap_err();
        let ureq::Error::Status(status, _) = err else {
            panic!("expected HTTP status error");
        };
        assert_eq!(status, 409);
        assert_eq!(control.take_comparison_key(), None);
    }
}
