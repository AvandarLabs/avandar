//! Background watcher that publishes the repo's diff signature.
//!
//! `dif` uses this to notice when the code `difit` is showing has changed (a
//! claude edit or commit, or the user's own edits) so it can warn that a
//! `difit` restart is needed to see the new diff. A dedicated thread keeps the
//! (subprocess-spawning) git calls off the 50ms UI loop; the event loop just
//! reads the latest signature under a lock and decides when to warn.

use std::path::PathBuf;
use std::sync::{
    Arc, Mutex,
    atomic::{AtomicBool, Ordering},
};
use std::thread::{self, JoinHandle};
use std::time::Duration;

use crate::git;

/// Handle to the running git-signature watcher thread.
pub struct GitWatcher {
    current: Arc<Mutex<Option<String>>>,
    stop: Arc<AtomicBool>,
    handle: Option<JoinHandle<()>>,
}

impl GitWatcher {
    /// Start watching `repo_root`, recomputing the diff signature every
    /// `interval`. The first signature is computed synchronously so
    /// [`current`](Self::current) is populated before the thread's first tick.
    #[must_use]
    pub fn start(repo_root: PathBuf, interval: Duration) -> Self {
        let current = Arc::new(Mutex::new(git::diff_signature(&repo_root)));
        let stop = Arc::new(AtomicBool::new(false));
        let handle = {
            let current = Arc::clone(&current);
            let stop = Arc::clone(&stop);
            thread::spawn(move || run(&repo_root, interval, &current, &stop))
        };
        Self {
            current,
            stop,
            handle: Some(handle),
        }
    }

    /// The most recently computed diff signature, if any.
    #[must_use]
    pub fn current(&self) -> Option<String> {
        self.current.lock().ok().and_then(|g| g.clone())
    }

    /// Signal the thread to stop and join it.
    pub fn stop(&mut self) {
        self.stop.store(true, Ordering::Relaxed);
        if let Some(handle) = self.handle.take() {
            let _ = handle.join();
        }
    }
}

impl Drop for GitWatcher {
    fn drop(&mut self) {
        self.stop();
    }
}

fn run(
    repo_root: &std::path::Path,
    interval: Duration,
    current: &Arc<Mutex<Option<String>>>,
    stop: &Arc<AtomicBool>,
) {
    while !stop.load(Ordering::Relaxed) {
        if let Some(sig) = git::diff_signature(repo_root) {
            if let Ok(mut slot) = current.lock() {
                *slot = Some(sig);
            }
        }
        sleep_interruptible(interval, stop);
    }
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
