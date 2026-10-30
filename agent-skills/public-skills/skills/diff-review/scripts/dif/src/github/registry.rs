//! The record of which review comments are bound for (or live on) the GitHub
//! PR, persisted as `.difit/<branch>-difit-<scope>-github.json`.
//!
//! The comment itself stays in the transcript like any other, so difit still
//! shows it after a relaunch. This sidecar only says which message ids are
//! PR-synced, which GitHub comment each maps to, and how its sync went. Two
//! threads touch it: the web shell marks a new comment `pending` the moment the
//! browser saves it (before difit or the poller can see it), and the poller's
//! sync pass posts it and records the outcome. Every mutation is saved
//! atomically while the lock is held.

use std::collections::{BTreeMap, HashSet};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex, MutexGuard};

use serde::{Deserialize, Serialize};

use crate::difit::transcript;

/// The pull request PR-synced comments are posted to.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PullRequest {
    pub number: u64,
    pub url: String,
    /// The PR head commit new comments are anchored to.
    pub head_sha: String,
}

/// Whether a PR is available to post to. Resolved once per session and never
/// persisted: the branch's PR can open or close between launches.
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub enum PrState {
    /// Not resolved yet.
    #[default]
    Unknown,
    /// The branch has an open PR.
    Available(PullRequest),
    /// No PR to post to, with the reason shown to the reviewer.
    Unavailable(String),
}

/// Where one PR-synced comment is in its lifecycle.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum SyncStatus {
    /// Marked for GitHub; not posted yet.
    Pending,
    /// Posted; edits and deletes are mirrored to GitHub.
    Synced,
    /// The last GitHub call failed. Editing the comment retries it.
    Failed,
}

/// One PR-synced comment, keyed by its difit message id.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncedComment {
    pub status: SyncStatus,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub github_id: Option<u64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,
    /// The body last sent to GitHub (or last attempted, when failed). A
    /// different body in difit means the reviewer edited the comment.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub body: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

impl SyncedComment {
    /// A freshly marked comment, not yet posted.
    #[must_use]
    pub const fn pending() -> Self {
        Self {
            status: SyncStatus::Pending,
            github_id: None,
            url: None,
            body: None,
            error: None,
        }
    }
}

/// The persisted registry plus the session's PR state.
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct Registry {
    #[serde(default)]
    pub comments: BTreeMap<String, SyncedComment>,
    #[serde(skip)]
    pub pr: PrState,
}

impl Registry {
    /// The browser's view: PR availability plus every comment's sync state.
    #[must_use]
    pub fn state_json(&self) -> serde_json::Value {
        let (available, pr, reason) = match &self.pr {
            PrState::Available(pr) => (true, serde_json::to_value(pr).ok(), None),
            PrState::Unavailable(reason) => (false, None, Some(reason.clone())),
            PrState::Unknown => (false, None, Some("Looking up this branch's PR…".to_owned())),
        };
        serde_json::json!({
            "available": available,
            "pr": pr,
            "reason": reason,
            "comments": self.comments,
        })
    }
}

/// The registry shared between the web shell and the poller, saved to `path`
/// on every change.
#[derive(Debug, Clone)]
pub struct SharedRegistry {
    inner: Arc<Mutex<Registry>>,
    path: PathBuf,
}

impl SharedRegistry {
    /// Load the registry at `path`. A missing or unreadable file starts empty.
    #[must_use]
    pub fn load(path: PathBuf) -> Self {
        let registry = fs::read_to_string(&path)
            .ok()
            .and_then(|text| serde_json::from_str(&text).ok())
            .unwrap_or_default();
        Self {
            inner: Arc::new(Mutex::new(registry)),
            path,
        }
    }

    /// Where the registry is persisted.
    #[must_use]
    pub fn path(&self) -> &Path {
        &self.path
    }

    /// A copy of the current registry.
    #[must_use]
    pub fn snapshot(&self) -> Registry {
        self.lock().clone()
    }

    /// Every message id bound for GitHub, in any state. These never reach the
    /// LLM pane.
    #[must_use]
    pub fn github_ids(&self) -> HashSet<String> {
        self.lock().comments.keys().cloned().collect()
    }

    /// Mark `ids` as bound for GitHub. Already-tracked ids are left alone.
    pub fn mark_pending(&self, ids: &[String]) {
        self.update(|registry| {
            for id in ids {
                registry
                    .comments
                    .entry(id.clone())
                    .or_insert_with(SyncedComment::pending);
            }
        });
    }

    /// Apply `change` and save the result while still holding the lock.
    pub fn update(&self, change: impl FnOnce(&mut Registry)) {
        let mut registry = self.lock();
        change(&mut registry);
        if let Ok(text) = serde_json::to_string_pretty(&*registry) {
            let _ = transcript::write_text(&self.path, &format!("{text}\n"));
        }
    }

    fn lock(&self) -> MutexGuard<'_, Registry> {
        self.inner
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn marking_persists_and_reloads() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("r-github.json");
        let registry = SharedRegistry::load(path.clone());
        registry.mark_pending(&["m1".to_owned()]);

        let reloaded = SharedRegistry::load(path);
        assert_eq!(
            reloaded.snapshot().comments["m1"].status,
            SyncStatus::Pending
        );
        assert!(reloaded.github_ids().contains("m1"));
    }

    #[test]
    fn marking_never_resets_a_synced_comment() {
        let dir = tempfile::tempdir().unwrap();
        let registry = SharedRegistry::load(dir.path().join("r.json"));
        registry.update(|r| {
            r.comments.insert(
                "m1".to_owned(),
                SyncedComment {
                    status: SyncStatus::Synced,
                    github_id: Some(7),
                    ..SyncedComment::pending()
                },
            );
        });
        registry.mark_pending(&["m1".to_owned()]);
        assert_eq!(registry.snapshot().comments["m1"].github_id, Some(7));
    }

    #[test]
    fn pr_state_is_not_persisted() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("r.json");
        let registry = SharedRegistry::load(path.clone());
        registry.update(|r| r.pr = PrState::Unavailable("no PR".to_owned()));
        assert_eq!(SharedRegistry::load(path).snapshot().pr, PrState::Unknown);
    }

    #[test]
    fn state_json_reports_availability() {
        let mut registry = Registry::default();
        assert_eq!(registry.state_json()["available"], false);
        registry.pr = PrState::Available(PullRequest {
            number: 12,
            url: "https://github.com/o/r/pull/12".to_owned(),
            head_sha: "abc".to_owned(),
        });
        let state = registry.state_json();
        assert_eq!(state["available"], true);
        assert_eq!(state["pr"]["number"], 12);
    }
}
