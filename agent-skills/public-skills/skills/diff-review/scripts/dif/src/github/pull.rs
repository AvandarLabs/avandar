//! Pure pull reconciliation: bring difit and the registry in line with what
//! is on the PR.
//!
//! Comments anyone added on GitHub (people, bots, or the reviewer on
//! github.com, including drafts in their pending review) are added to difit
//! under their author's login, and recorded as PR comments so they never reach
//! the LLM. Edits made on GitHub replace the local body unless the reviewer
//! has an unsent local edit of the same comment, which wins (the push pass
//! sends it). Comments deleted on GitHub, and threads resolved there, are
//! removed from difit.

use std::collections::{BTreeMap, HashMap, HashSet};

use serde_json::{Value, json};

use crate::difit::editor::DifitEdit;
use crate::difit::imports::Snapshot;

use super::anchor::Side;
use super::graphql::{RemoteComment, RemoteState, RemoteThread};
use super::registry::{Registry, SyncStatus, SyncedComment};
use super::session::ViewedState;

/// difit's default author, the only one whose comments difit lets you edit.
const EDITABLE_AUTHOR: &str = "User";

/// What a pull changes locally.
#[derive(Debug, Default, PartialEq, Eq)]
pub struct PullPlan {
    /// Changes to difit's comments.
    pub edits: Vec<DifitEdit>,
    /// Registry entries to add or replace.
    pub upserts: Vec<(String, SyncedComment)>,
    /// Registry entries to drop.
    pub forgets: Vec<String>,
    /// Message ids removed from difit (so a stale browser save that brings one
    /// back is still kept from the LLM).
    pub removed: Vec<String>,
}

/// Where each difit message is: its thread, its index, and its body.
struct Local<'a> {
    messages: HashMap<&'a str, (&'a str, usize, &'a str)>,
    threads: HashMap<&'a str, Vec<&'a str>>,
}

impl<'a> Local<'a> {
    fn new(snapshot: &'a Snapshot) -> Self {
        let mut messages = HashMap::new();
        let mut threads = HashMap::new();
        for thread in &snapshot.threads {
            let thread_id = thread.id.as_deref().unwrap_or_default();
            let ids: Vec<&str> = thread
                .messages
                .iter()
                .filter_map(|m| m.id.as_deref())
                .collect();
            for (index, message) in thread.messages.iter().enumerate() {
                if let Some(id) = message.id.as_deref() {
                    messages.insert(id, (thread_id, index, message.body.as_str()));
                }
            }
            threads.insert(thread_id, ids);
        }
        Self { messages, threads }
    }
}

/// The local changes that mirror `remote`.
#[must_use]
pub fn reconcile(remote: &RemoteState, registry: &Registry, snapshot: &Snapshot) -> PullPlan {
    let local = Local::new(snapshot);
    let mut plan = PullPlan::default();
    for thread in &remote.threads {
        if thread.resolved {
            for comment in &thread.comments {
                if let Some(id) = registry.message_for_node(&comment.node_id) {
                    remove(&local, registry, id, &mut plan);
                }
            }
        } else {
            reconcile_thread(thread, registry, &local, &mut plan);
        }
    }
    remove_deleted(remote, registry, &local, &mut plan);
    plan
}

fn reconcile_thread(
    thread: &RemoteThread,
    registry: &Registry,
    local: &Local,
    plan: &mut PullPlan,
) {
    let mut local_thread: Option<String> = None;
    for (index, comment) in thread.comments.iter().enumerate() {
        if let Some(id) = registry.message_for_node(&comment.node_id) {
            if index == 0 {
                local_thread = local.messages.get(id).map(|(t, _, _)| (*t).to_owned());
            }
            reconcile_known(id, comment, &registry.comments[id], local, plan);
            continue;
        }
        let id = format!("gh:{}", comment.node_id);
        let message = message_value(&id, comment);
        if index == 0 {
            if !local.messages.contains_key(id.as_str()) {
                plan.edits
                    .push(DifitEdit::AddThread(thread_value(&id, thread, &message)));
            }
            local_thread = Some(id.clone());
        } else if let Some(thread_id) = &local_thread {
            plan.edits.push(DifitEdit::AddMessage {
                thread_id: thread_id.clone(),
                message,
            });
        } else {
            continue;
        }
        plan.upserts
            .push((id, entry_for(comment, thread, index == 0)));
    }
}

/// A comment both sides know: take GitHub's body unless the reviewer has an
/// unsent local edit, and note a draft that has since been submitted.
fn reconcile_known(
    id: &str,
    comment: &RemoteComment,
    entry: &SyncedComment,
    local: &Local,
    plan: &mut PullPlan,
) {
    let mut next = entry.clone();
    if entry.is_on_github() {
        next.status = if comment.pending {
            SyncStatus::Draft
        } else {
            SyncStatus::Published
        };
    }
    let local_body = local.messages.get(id).map(|(_, _, body)| *body);
    let remote_edited = entry.body.as_deref() != Some(comment.body.as_str());
    if remote_edited && local_body.is_some() && local_body == entry.body.as_deref() {
        plan.edits.push(DifitEdit::SetBody {
            message_id: id.to_owned(),
            body: comment.body.clone(),
            updated_at: comment.updated_at.clone(),
        });
        next.body = Some(comment.body.clone());
    }
    if next != *entry {
        plan.upserts.push((id.to_owned(), next));
    }
}

/// Drop comments that are gone from GitHub. A thread whose comments did not
/// all fetch is left alone: a missing comment there proves nothing. A missing
/// draft only counts once the pending review itself is gone (discarded on
/// github.com): while it exists, a draft GitHub did not list is kept.
fn remove_deleted(remote: &RemoteState, registry: &Registry, local: &Local, plan: &mut PullPlan) {
    let present: HashSet<&str> = remote
        .threads
        .iter()
        .flat_map(|t| t.comments.iter().map(|c| c.node_id.as_str()))
        .collect();
    let partial: HashSet<&str> = remote
        .threads
        .iter()
        .filter(|t| !t.complete)
        .map(|t| t.node_id.as_str())
        .collect();
    for (id, entry) in &registry.comments {
        let (Some(node), true) = (entry.node_id.as_deref(), entry.is_on_github()) else {
            continue;
        };
        let in_partial = entry
            .thread_id
            .as_deref()
            .is_some_and(|t| partial.contains(t));
        let draft_kept = entry.status == SyncStatus::Draft && remote.has_pending_review;
        if !present.contains(node) && !in_partial && !draft_kept {
            remove(local, registry, id, plan);
        }
    }
}

/// Remove `id` from difit and the registry. Removing a thread's first message
/// removes the whole difit thread, so every PR comment in it is forgotten too.
fn remove(local: &Local, registry: &Registry, id: &str, plan: &mut PullPlan) {
    let gone: Vec<String> = match local.messages.get(id) {
        Some((thread_id, 0, _)) => local.threads[thread_id]
            .iter()
            .map(|m| (*m).to_owned())
            .collect(),
        _ => vec![id.to_owned()],
    };
    if local.messages.contains_key(id) && !plan.removed.iter().any(|r| r == id) {
        plan.edits.push(DifitEdit::Remove {
            message_id: id.to_owned(),
        });
    }
    for gone_id in gone {
        if registry.comments.contains_key(&gone_id) && !plan.forgets.contains(&gone_id) {
            plan.forgets.push(gone_id.clone());
        }
        if !plan.removed.contains(&gone_id) {
            plan.removed.push(gone_id);
        }
    }
}

fn entry_for(comment: &RemoteComment, thread: &RemoteThread, root: bool) -> SyncedComment {
    SyncedComment {
        status: if comment.pending {
            SyncStatus::Draft
        } else {
            SyncStatus::Published
        },
        node_id: Some(comment.node_id.clone()),
        thread_id: Some(thread.node_id.clone()),
        root,
        url: Some(comment.url.clone()),
        body: Some(comment.body.clone()),
        error: None,
    }
}

fn message_value(id: &str, comment: &RemoteComment) -> Value {
    let author = if comment.viewer_did_author {
        EDITABLE_AUTHOR
    } else {
        comment.author.as_str()
    };
    json!({
        "id": id,
        "body": comment.body,
        "author": author,
        "createdAt": comment.created_at,
        "updatedAt": comment.updated_at,
    })
}

fn thread_value(id: &str, thread: &RemoteThread, message: &Value) -> Value {
    let side = match thread.side {
        Side::Left => "old",
        Side::Right => "new",
    };
    let line = thread.start_line.map_or_else(
        || json!(thread.line),
        |start| json!({ "start": start, "end": thread.line }),
    );
    json!({
        "id": id,
        "filePath": thread.path,
        "createdAt": message["createdAt"],
        "updatedAt": message["updatedAt"],
        "position": { "side": side, "line": line },
        "messages": [message],
    })
}

/// The viewed changes the browser must apply to difit: every file on the first
/// pull (GitHub wins at startup), then only files whose state changed.
#[must_use]
pub fn viewed_changes(
    files: &[(String, ViewedState)],
    previous: &BTreeMap<String, ViewedState>,
    initialized: bool,
) -> Vec<(String, bool)> {
    let viewed = |state: ViewedState| state == ViewedState::Viewed;
    files
        .iter()
        .filter(|(path, state)| {
            !initialized
                || previous
                    .get(path)
                    .is_none_or(|before| viewed(*before) != viewed(*state))
        })
        .map(|(path, state)| (path.clone(), viewed(*state)))
        .collect()
}

#[cfg(test)]
#[path = "pull_tests.rs"]
mod tests;
