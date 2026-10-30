//! Pure push planning: compare difit's live comments with the registry and
//! decide which GitHub calls make the PR match what the reviewer did in dif.
//!
//! New PR comments go into the reviewer's pending review as drafts (GitHub's
//! "Start a review"); they become visible when the review is submitted. An edit
//! is mirrored. A single message deleted in difit is deleted on GitHub. A whole
//! thread removed in difit (its "Resolve") resolves the GitHub conversation
//! when it is published, and deletes it while it is still a draft.
//!
//! Removals only count when the previous snapshot still held the comment, so a
//! snapshot that is merely incomplete (difit restarting, a stale read) never
//! changes anything on GitHub.

use std::collections::{HashMap, HashSet};

use crate::difit::imports::{ServerThread, Snapshot};

use super::anchor::{NewComment, new_comment};
use super::registry::{Registry, SyncStatus, SyncedComment};

/// One GitHub call (or local bookkeeping step) the push pass should make.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum SyncAction {
    /// Open a new draft thread in the pending review.
    AddThread {
        message_id: String,
        comment: NewComment,
    },
    /// Add a draft reply to an existing GitHub thread.
    AddReply {
        message_id: String,
        thread_id: String,
        body: String,
    },
    /// Mirror an edited body.
    Update {
        message_id: String,
        node_id: String,
        body: String,
    },
    /// Delete a comment (a deleted message, or a draft whose thread was removed).
    Delete { message_id: String, node_id: String },
    /// Resolve a published conversation whose thread was removed in difit.
    Resolve {
        message_id: String,
        thread_id: String,
    },
    /// Drop an entry with nothing left to do on GitHub.
    Forget { message_id: String },
    /// Record a comment that can never be posted as it stands.
    Reject {
        message_id: String,
        body: String,
        reason: String,
    },
}

/// What the previous snapshot held: every message id and the difit thread it
/// was in.
#[derive(Debug, Clone, Default)]
pub struct Previous {
    thread_of: HashMap<String, String>,
}

impl Previous {
    /// Record `snapshot` for the next pass.
    #[must_use]
    pub fn from_snapshot(snapshot: &Snapshot) -> Self {
        let mut thread_of = HashMap::new();
        for thread in &snapshot.threads {
            let thread_id = thread.id.clone().unwrap_or_default();
            for message in &thread.messages {
                if let Some(id) = &message.id {
                    thread_of.insert(id.clone(), thread_id.clone());
                }
            }
        }
        Self { thread_of }
    }

    fn held(&self, id: &str) -> bool {
        self.thread_of.contains_key(id)
    }
}

/// The actions that bring the PR in line with `snapshot`.
#[must_use]
pub fn plan(snapshot: &Snapshot, previous: &Previous, registry: &Registry) -> Vec<SyncAction> {
    let mut actions = Vec::new();
    for thread in &snapshot.threads {
        plan_thread(thread, registry, &mut actions);
    }
    let live_messages = message_ids(snapshot);
    let live_threads: HashSet<&str> = snapshot
        .threads
        .iter()
        .filter_map(|t| t.id.as_deref())
        .collect();
    for (id, entry) in &registry.comments {
        if live_messages.contains(id) || !previous.held(id) {
            continue;
        }
        let thread_removed = previous
            .thread_of
            .get(id)
            .is_none_or(|thread| !live_threads.contains(thread.as_str()));
        actions.push(removal(id, entry, thread_removed));
    }
    actions
}

/// What to do on GitHub for a comment that is gone from difit.
fn removal(id: &str, entry: &SyncedComment, thread_removed: bool) -> SyncAction {
    let message_id = id.to_owned();
    let forget = || SyncAction::Forget {
        message_id: id.to_owned(),
    };
    let Some(node_id) = entry.node_id.clone() else {
        return forget();
    };
    match (entry.status, thread_removed, entry.root, &entry.thread_id) {
        (SyncStatus::Published, true, true, Some(thread_id)) => SyncAction::Resolve {
            message_id,
            thread_id: thread_id.clone(),
        },
        (SyncStatus::Draft, _, _, _) | (SyncStatus::Published, false, _, _) => SyncAction::Delete {
            message_id,
            node_id,
        },
        _ => forget(),
    }
}

/// Every message id in a snapshot.
#[must_use]
pub fn message_ids(snapshot: &Snapshot) -> HashSet<String> {
    snapshot
        .threads
        .iter()
        .flat_map(|thread| thread.messages.iter().filter_map(|m| m.id.clone()))
        .collect()
}

fn plan_thread(thread: &ServerThread, registry: &Registry, actions: &mut Vec<SyncAction>) {
    let root = thread
        .messages
        .first()
        .and_then(|m| m.id.as_deref())
        .and_then(|id| registry.comments.get(id));
    for (index, message) in thread.messages.iter().enumerate() {
        let Some(id) = message.id.as_deref() else {
            continue;
        };
        let Some(entry) = registry.comments.get(id) else {
            continue;
        };
        let parent = if index == 0 { None } else { root };
        if let Some(action) = plan_message(thread, id, &message.body, entry, parent) {
            actions.push(action);
        }
    }
}

fn plan_message(
    thread: &ServerThread,
    id: &str,
    body: &str,
    entry: &SyncedComment,
    parent: Option<&SyncedComment>,
) -> Option<SyncAction> {
    match entry.status {
        SyncStatus::Draft | SyncStatus::Published => {
            let node_id = entry.node_id.clone()?;
            (entry.body.as_deref() != Some(body)).then(|| SyncAction::Update {
                message_id: id.to_owned(),
                node_id,
                body: body.to_owned(),
            })
        }
        SyncStatus::Failed if entry.body.as_deref() == Some(body) => None,
        SyncStatus::Pending | SyncStatus::Failed => post_action(thread, id, body, parent),
    }
}

/// How to post a comment for the first time: a reply when its thread's root is
/// already on GitHub, otherwise a new thread at the difit thread's position. A
/// reply whose root is still being posted waits for the next pass.
fn post_action(
    thread: &ServerThread,
    id: &str,
    body: &str,
    parent: Option<&SyncedComment>,
) -> Option<SyncAction> {
    if let Some(parent) = parent {
        match (parent.is_on_github(), &parent.thread_id, parent.status) {
            (true, Some(thread_id), _) => {
                return Some(SyncAction::AddReply {
                    message_id: id.to_owned(),
                    thread_id: thread_id.clone(),
                    body: body.to_owned(),
                });
            }
            (_, _, SyncStatus::Pending) => return None,
            _ => {}
        }
    }
    Some(match new_comment(thread, body) {
        Ok(comment) => SyncAction::AddThread {
            message_id: id.to_owned(),
            comment,
        },
        Err(reason) => SyncAction::Reject {
            message_id: id.to_owned(),
            body: body.to_owned(),
            reason,
        },
    })
}

#[cfg(test)]
#[path = "plan_tests.rs"]
mod tests;
