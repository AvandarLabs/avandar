//! The record of which review comments are bound for (or live on) the GitHub
//! PR, persisted as `.difit/<branch>-difit-<scope>-github.json`, plus the
//! session's live GitHub state.
//!
//! The comment itself stays in the transcript like any other, so difit still
//! shows it after a relaunch. The persisted part only says which message ids
//! are PR comments, which GitHub comment and thread each maps to, and where it
//! is in its lifecycle. Several threads touch it: the web shell marks a new
//! comment `pending` the moment the browser saves it (before difit or the
//! poller can see it) and queues reviewer requests; the poller's sync pass talks
//! to GitHub and records the outcomes. Every mutation is saved atomically while
//! the lock is held.

use std::collections::{BTreeMap, HashSet};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex, MutexGuard};

use serde::{Deserialize, Serialize};

use super::session::Session;
use crate::difit::transcript;

/// Where one PR comment is in its lifecycle.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum SyncStatus {
    /// Marked for the PR in dif; not on GitHub yet.
    Pending,
    /// In the reviewer's pending GitHub review: visible only to them until the
    /// review is submitted.
    Draft,
    /// Visible on the PR.
    Published,
    /// The last GitHub call failed. Editing the comment retries it.
    Failed,
}

/// One PR comment, keyed by its difit message id.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncedComment {
    pub status: SyncStatus,
    /// The GitHub GraphQL node id of the comment.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub node_id: Option<String>,
    /// The GitHub GraphQL node id of the review thread it belongs to.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub thread_id: Option<String>,
    /// Whether it opened its GitHub thread (as opposed to replying in one).
    #[serde(default)]
    pub root: bool,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,
    /// The body last agreed with GitHub (or last attempted, when failed). A
    /// different body in difit means the reviewer edited the comment; a
    /// different body on GitHub means someone edited it there.
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
            node_id: None,
            thread_id: None,
            root: false,
            url: None,
            body: None,
            error: None,
        }
    }

    /// Whether the comment exists on GitHub (as a draft or published).
    #[must_use]
    pub const fn is_on_github(&self) -> bool {
        matches!(self.status, SyncStatus::Draft | SyncStatus::Published)
    }
}

/// The persisted registry.
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct Registry {
    #[serde(default)]
    pub comments: BTreeMap<String, SyncedComment>,
}

impl Registry {
    /// The difit message id mapped to GitHub comment `node_id`, if any.
    #[must_use]
    pub fn message_for_node(&self, node_id: &str) -> Option<&str> {
        self.comments
            .iter()
            .find(|(_, entry)| entry.node_id.as_deref() == Some(node_id))
            .map(|(id, _)| id.as_str())
    }

    /// How many comments still wait for a review submit (marked or drafted).
    #[must_use]
    pub fn draft_count(&self) -> usize {
        self.count_matching(|status| matches!(status, SyncStatus::Pending | SyncStatus::Draft))
    }

    /// How many comments GitHub rejected.
    #[must_use]
    pub fn failed_count(&self) -> usize {
        self.count_matching(|status| status == SyncStatus::Failed)
    }

    fn count_matching(&self, matches_status: impl Fn(SyncStatus) -> bool) -> usize {
        self.comments
            .values()
            .filter(|c| matches_status(c.status))
            .count()
    }
}

/// Everything the lock guards: the persisted registry and the session.
#[derive(Debug, Default)]
pub struct State {
    pub registry: Registry,
    pub session: Session,
}

/// The state shared between the web shell and the poller, with the registry
/// saved to `path` on every change.
#[derive(Debug, Clone)]
pub struct SharedRegistry {
    inner: Arc<Mutex<State>>,
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
            inner: Arc::new(Mutex::new(State {
                registry,
                session: Session::new(),
            })),
            path,
        }
    }

    /// Where the registry is persisted.
    #[must_use]
    pub fn path(&self) -> &Path {
        &self.path
    }

    /// A copy of the persisted registry.
    #[must_use]
    pub fn snapshot(&self) -> Registry {
        self.lock().registry.clone()
    }

    /// Read the state under the lock.
    pub fn read<T>(&self, read: impl FnOnce(&State) -> T) -> T {
        read(&self.lock())
    }

    /// Every message id that must never reach the LLM pane: PR comments in any
    /// state, plus comments removed because GitHub deleted or resolved them.
    #[must_use]
    pub fn github_ids(&self) -> HashSet<String> {
        let state = self.lock();
        state
            .registry
            .comments
            .keys()
            .chain(state.session.tombstones.iter())
            .cloned()
            .collect()
    }

    /// Mark `ids` as bound for the PR. Already-tracked ids are left alone.
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

    /// Apply `change` to the registry and save it while still holding the lock.
    pub fn update(&self, change: impl FnOnce(&mut Registry)) {
        self.update_state(|state| change(&mut state.registry));
    }

    /// Apply `change` to the whole state, saving the registry afterwards.
    ///
    /// The lock is held through the save on purpose, so two writers can never
    /// interleave their saves out of order.
    #[allow(clippy::significant_drop_tightening)]
    pub fn update_state<T>(&self, change: impl FnOnce(&mut State) -> T) -> T {
        let mut state = self.lock();
        let change_result = change(&mut state);
        if let Ok(text) = serde_json::to_string_pretty(&state.registry) {
            let _ = transcript::write_text(&self.path, &format!("{text}\n"));
        }
        change_result
    }

    /// Apply `change` to the session only (nothing to save).
    pub fn session<T>(&self, change: impl FnOnce(&mut Session) -> T) -> T {
        change(&mut self.lock().session)
    }

    fn lock(&self) -> MutexGuard<'_, State> {
        self.inner
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::github::session::PrState;

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
    fn marking_never_resets_a_posted_comment() {
        let dir = tempfile::tempdir().unwrap();
        let registry = SharedRegistry::load(dir.path().join("r.json"));
        registry.update(|r| {
            r.comments.insert(
                "m1".to_owned(),
                SyncedComment {
                    status: SyncStatus::Draft,
                    node_id: Some("PRRC_1".to_owned()),
                    ..SyncedComment::pending()
                },
            );
        });
        registry.mark_pending(&["m1".to_owned()]);
        assert_eq!(
            registry.snapshot().comments["m1"].node_id.as_deref(),
            Some("PRRC_1")
        );
    }

    #[test]
    fn session_state_is_not_persisted() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("r.json");
        let registry = SharedRegistry::load(path.clone());
        registry.update_state(|s| s.session.pr = PrState::Unavailable("no PR".to_owned()));
        assert_eq!(
            SharedRegistry::load(path).read(|s| s.session.pr.clone()),
            PrState::Unknown
        );
    }

    #[test]
    fn tombstoned_ids_are_kept_from_the_llm() {
        let dir = tempfile::tempdir().unwrap();
        let registry = SharedRegistry::load(dir.path().join("r.json"));
        registry.session(|s| s.tombstones.insert("gh:gone".to_owned()));
        assert!(registry.github_ids().contains("gh:gone"));
    }

    #[test]
    fn counts_drafts_and_failures() {
        let mut registry = Registry::default();
        for (id, status) in [
            ("a", SyncStatus::Pending),
            ("b", SyncStatus::Draft),
            ("c", SyncStatus::Published),
            ("d", SyncStatus::Failed),
        ] {
            registry.comments.insert(
                id.to_owned(),
                SyncedComment {
                    status,
                    ..SyncedComment::pending()
                },
            );
        }
        assert_eq!(registry.draft_count(), 2);
        assert_eq!(registry.failed_count(), 1);
    }
}
