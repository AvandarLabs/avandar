//! Background poller: mirrors difit's live comments into shared state + disk.
//!
//! A dedicated thread polls `GET /api/comments-json` once per interval, parses
//! the snapshot, publishes the latest under a shared lock for the TUI to read
//! (injection detection), and atomically rewrites the transcript file whenever
//! the content changes. This replaces the retired `difit-watch.py`.

use std::path::PathBuf;
use std::sync::{
    Arc, Mutex,
    atomic::{AtomicBool, Ordering},
};
use std::thread::{self, JoinHandle};
use std::time::Duration;

use super::imports::{Snapshot, snapshot_to_imports};
use super::transcript;

/// Handle to the running poller thread + the latest snapshot it has seen.
pub struct Poller {
    latest: Arc<Mutex<Option<Snapshot>>>,
    stop: Arc<AtomicBool>,
    handle: Option<JoinHandle<()>>,
}

impl Poller {
    /// Start polling `port`, mirroring into `transcript_path`. The thread runs
    /// until [`Poller::stop`] (or drop).
    #[must_use]
    pub fn start(port: u16, transcript_path: PathBuf, interval: Duration) -> Self {
        let latest = Arc::new(Mutex::new(None));
        let stop = Arc::new(AtomicBool::new(false));
        let handle = {
            let latest = Arc::clone(&latest);
            let stop = Arc::clone(&stop);
            thread::spawn(move || run(port, &transcript_path, interval, &latest, &stop))
        };
        Self {
            latest,
            stop,
            handle: Some(handle),
        }
    }

    /// A clone of the most recent snapshot, if any has been fetched.
    #[must_use]
    pub fn latest(&self) -> Option<Snapshot> {
        self.latest.lock().ok().and_then(|g| g.clone())
    }

    /// Signal the thread to stop and join it.
    pub fn stop(&mut self) {
        self.stop.store(true, Ordering::Relaxed);
        if let Some(handle) = self.handle.take() {
            let _ = handle.join();
        }
    }
}

impl Drop for Poller {
    fn drop(&mut self) {
        self.stop();
    }
}

fn run(
    port: u16,
    transcript_path: &std::path::Path,
    interval: Duration,
    latest: &Arc<Mutex<Option<Snapshot>>>,
    stop: &Arc<AtomicBool>,
) {
    let url = format!("http://localhost:{port}/api/comments-json");
    let mut last_written: Option<String> = None;

    while !stop.load(Ordering::Relaxed) {
        if let Some(snapshot) = fetch(&url) {
            let imports = snapshot_to_imports(&snapshot);
            // Only rewrite the transcript when the serialized content changes.
            if let Ok(serialized) = serde_json::to_string(&imports) {
                if last_written.as_deref() != Some(serialized.as_str())
                    && transcript::write(transcript_path, &imports).is_ok()
                {
                    last_written = Some(serialized);
                }
            }
            if let Ok(mut slot) = latest.lock() {
                *slot = Some(snapshot);
            }
        }
        sleep_interruptible(interval, stop);
    }
}

fn fetch(url: &str) -> Option<Snapshot> {
    ureq::get(url)
        .timeout(Duration::from_millis(800))
        .call()
        .ok()?
        .into_json::<Snapshot>()
        .ok()
}

/// Sleep `interval`, waking early (every 100ms) to notice the stop flag.
fn sleep_interruptible(interval: Duration, stop: &Arc<AtomicBool>) {
    let tick = Duration::from_millis(100);
    let mut elapsed = Duration::ZERO;
    while elapsed < interval && !stop.load(Ordering::Relaxed) {
        thread::sleep(tick);
        elapsed += tick;
    }
}
