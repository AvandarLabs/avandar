//! Background poller: keeps difit's live comments and the transcript in step.
//!
//! A dedicated thread polls `GET /api/comments-json` once per interval, parses
//! the snapshot, publishes the latest under a shared lock for the TUI to read
//! (injection detection), and atomically rewrites the transcript file whenever
//! the content changes. This replaces the retired `difit-watch.py`.
//!
//! The transcript is not write-only, though: the `diff-review` skill authors its
//! review rounds straight into that file while difit is already serving. Before
//! mirroring, the thread therefore checks whether the file changed underneath it
//! and imports anything difit has never held (see [`importer`](super::importer)),
//! so the skill's threads reach the open browser instead of being overwritten.

use std::collections::HashSet;
use std::path::{Path, PathBuf};
use std::sync::{
    Arc, Mutex,
    atomic::{AtomicBool, Ordering},
};
use std::thread::{self, JoinHandle};
use std::time::Duration;

use super::imports::{Snapshot, snapshot_to_imports};
use super::{importer, transcript};
use crate::github::sync::GithubSync;

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
        Self::start_with_github(port, transcript_path, interval, None)
    }

    /// Like [`Poller::start`], also running `github` over every snapshot so
    /// PR-bound comments are posted, edited, and deleted on the PR.
    #[must_use]
    pub fn start_with_github(
        port: u16,
        transcript_path: PathBuf,
        interval: Duration,
        mut github: Option<GithubSync>,
    ) -> Self {
        let latest = Arc::new(Mutex::new(None));
        let stop = Arc::new(AtomicBool::new(false));
        let handle = {
            let latest = Arc::clone(&latest);
            let stop = Arc::clone(&stop);
            thread::spawn(move || {
                run(
                    port,
                    &transcript_path,
                    interval,
                    &latest,
                    &stop,
                    &mut github,
                );
            })
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
    transcript_path: &Path,
    interval: Duration,
    latest: &Arc<Mutex<Option<Snapshot>>>,
    stop: &Arc<AtomicBool>,
    github: &mut Option<GithubSync>,
) {
    let url = format!("http://localhost:{port}/api/comments-json");
    // The exact text we last mirrored, so anything else on disk is an inbound
    // write from the skill.
    let mut last_written: Option<String> = None;
    // Every id difit has held this session, plus everything we imported.
    let mut seen: HashSet<String> = HashSet::new();
    // The version of the last snapshot mirrored, to tell a new difit session
    // (its version starts over) from the one being mirrored.
    let mut last_version: Option<i64> = None;

    while !stop.load(Ordering::Relaxed) {
        if let Some(snapshot) = fetch(&url) {
            // A fresh difit session is not a mass deletion: skip the GitHub
            // pass and the mirror so neither treats every comment as removed.
            if reseed_new_session(port, transcript_path, &snapshot, last_version) {
                sleep_interruptible(interval, stop);
                continue;
            }
            last_version = Some(snapshot.version);
            seen.extend(importer::snapshot_ids(&snapshot));
            if let Some(github) = github.as_mut() {
                github.tick(&snapshot);
            }
            // An inbound write wins this tick: mirroring now would overwrite the
            // skill's round before difit has ingested it. The next poll sees the
            // imported entries in difit and mirrors the merged conversation.
            if import_inbound(port, transcript_path, last_written.as_deref(), &mut seen) {
                publish(latest, snapshot);
                sleep_interruptible(interval, stop);
                continue;
            }
            if let Some(text) = mirror(transcript_path, &snapshot, last_written.as_deref()) {
                last_written = Some(text);
            }
            publish(latest, snapshot);
        }
        sleep_interruptible(interval, stop);
    }
}

/// Import the transcript entries a new difit comment session lacks. Returns
/// whether it did, so the caller skips this tick. A failed POST is retried on
/// the next tick, since the session still lacks them.
fn reseed_new_session(
    port: u16,
    transcript_path: &Path,
    snapshot: &Snapshot,
    last_version: Option<i64>,
) -> bool {
    let Ok(text) = std::fs::read_to_string(transcript_path) else {
        return false;
    };
    let entries = importer::reseed_entries(snapshot, &text, last_version);
    if entries.is_empty() {
        return false;
    }
    let _ = importer::post(port, &entries);
    true
}

/// Push transcript entries difit has never held into the live server. Returns
/// whether this tick found any, so the caller can hold off on mirroring.
///
/// A failed POST leaves the ids unseen so the next tick retries; the transcript
/// keeps the skill's entries either way.
fn import_inbound(
    port: u16,
    transcript_path: &Path,
    last_written: Option<&str>,
    seen: &mut HashSet<String>,
) -> bool {
    let Ok(text) = std::fs::read_to_string(transcript_path) else {
        return false;
    };
    let inbound = importer::inbound_entries(&text, last_written, seen);
    if inbound.is_empty() {
        return false;
    }
    if importer::post(port, &inbound) {
        seen.extend(inbound.into_iter().map(|entry| entry.id));
    }
    true
}

/// Rewrite the transcript from `snapshot` when its content changed. Returns the
/// text written, or `None` when the file already matched (or the write failed).
fn mirror(
    transcript_path: &Path,
    snapshot: &Snapshot,
    last_written: Option<&str>,
) -> Option<String> {
    let text = transcript::serialize(&snapshot_to_imports(snapshot)).ok()?;
    if last_written == Some(text.as_str()) {
        return None;
    }
    transcript::write_text(transcript_path, &text)
        .ok()
        .map(|()| text)
}

fn publish(latest: &Arc<Mutex<Option<Snapshot>>>, snapshot: Snapshot) {
    if let Ok(mut slot) = latest.lock() {
        *slot = Some(snapshot);
    }
}

fn fetch(url: &str) -> Option<Snapshot> {
    ureq::get(url)
        .config()
        .timeout_global(Some(Duration::from_millis(800)))
        .build()
        .call()
        .ok()?
        .body_mut()
        .read_json::<Snapshot>()
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
