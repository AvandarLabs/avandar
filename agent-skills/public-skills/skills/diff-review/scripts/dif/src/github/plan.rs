//! Pure sync planning: compare difit's live comments with the registry and
//! decide which GitHub calls make the PR match.
//!
//! difit is the source of truth. A comment marked for GitHub is posted; an edit
//! to a synced comment's body is mirrored; a synced comment that vanished from
//! difit is deleted from the PR. A deletion only counts when the previous
//! snapshot still held the comment, so a snapshot that is merely incomplete
//! (difit restarting, a stale read) never deletes anything from GitHub.

use std::collections::HashSet;
use std::hash::BuildHasher;

use crate::difit::imports::{ServerThread, Snapshot};

use super::anchor::{NewComment, new_comment};
use super::registry::{Registry, SyncStatus, SyncedComment};

/// One GitHub call (or local bookkeeping step) the sync pass should make.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum SyncAction {
    /// Post a new top-level comment.
    Create {
        message_id: String,
        comment: NewComment,
    },
    /// Reply to an existing PR comment thread.
    Reply {
        message_id: String,
        in_reply_to: u64,
        body: String,
    },
    /// Mirror an edited body.
    Update {
        message_id: String,
        github_id: u64,
        body: String,
    },
    /// Delete a comment the reviewer removed in difit.
    Delete { message_id: String, github_id: u64 },
    /// Drop a never-posted entry whose comment was removed in difit.
    Forget { message_id: String },
    /// Record a comment that can never be posted as it stands.
    Reject {
        message_id: String,
        body: String,
        reason: String,
    },
}

/// The actions that bring the PR in line with `snapshot`.
///
/// `previous_ids` are the message ids of the prior snapshot (empty on the
/// first pass, which therefore never deletes).
#[must_use]
pub fn plan<S: BuildHasher>(
    snapshot: &Snapshot,
    previous_ids: &HashSet<String, S>,
    registry: &Registry,
) -> Vec<SyncAction> {
    let mut actions = Vec::new();
    for thread in &snapshot.threads {
        plan_thread(thread, registry, &mut actions);
    }
    let live = message_ids(snapshot);
    for (id, entry) in &registry.comments {
        if live.contains(id) || !previous_ids.contains(id) {
            continue;
        }
        actions.push(match (entry.status, entry.github_id) {
            (SyncStatus::Synced, Some(github_id)) => SyncAction::Delete {
                message_id: id.clone(),
                github_id,
            },
            _ => SyncAction::Forget {
                message_id: id.clone(),
            },
        });
    }
    actions
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
        SyncStatus::Synced => {
            let github_id = entry.github_id?;
            (entry.body.as_deref() != Some(body)).then(|| SyncAction::Update {
                message_id: id.to_owned(),
                github_id,
                body: body.to_owned(),
            })
        }
        SyncStatus::Failed if entry.body.as_deref() == Some(body) => None,
        SyncStatus::Pending | SyncStatus::Failed => post_action(thread, id, body, parent),
    }
}

/// How to post a comment for the first time: a reply when its thread's root is
/// already on GitHub, otherwise a new comment at the thread's position. A reply
/// whose root is still being posted waits for the next pass.
fn post_action(
    thread: &ServerThread,
    id: &str,
    body: &str,
    parent: Option<&SyncedComment>,
) -> Option<SyncAction> {
    if let Some(parent) = parent {
        match (parent.status, parent.github_id) {
            (SyncStatus::Synced, Some(in_reply_to)) => {
                return Some(SyncAction::Reply {
                    message_id: id.to_owned(),
                    in_reply_to,
                    body: body.to_owned(),
                });
            }
            (SyncStatus::Pending, _) => return None,
            _ => {}
        }
    }
    Some(match new_comment(thread, body) {
        Ok(comment) => SyncAction::Create {
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
mod tests {
    use super::*;
    use crate::github::anchor::Side;
    use crate::github::registry::SyncedComment;

    fn snap(json: &str) -> Snapshot {
        serde_json::from_str(json).expect("valid snapshot")
    }

    fn registry(entries: &[(&str, SyncedComment)]) -> Registry {
        Registry {
            comments: entries
                .iter()
                .map(|(id, entry)| ((*id).to_owned(), entry.clone()))
                .collect(),
            ..Registry::default()
        }
    }

    fn synced(github_id: u64, body: &str) -> SyncedComment {
        SyncedComment {
            status: SyncStatus::Synced,
            github_id: Some(github_id),
            body: Some(body.to_owned()),
            ..SyncedComment::pending()
        }
    }

    const ROOT_AND_REPLY: &str = r#"{"version":3,"threads":[{"id":"t1","filePath":"src/a.rs",
        "position":{"side":"new","line":{"start":10,"end":12}},
        "messages":[{"id":"m1","body":"why?","author":"User"},
                    {"id":"m2","body":"also this","author":"User"}]}]}"#;

    #[test]
    fn pending_root_is_created_at_its_range() {
        let actions = plan(
            &snap(ROOT_AND_REPLY),
            &HashSet::new(),
            &registry(&[("m1", SyncedComment::pending())]),
        );
        assert_eq!(
            actions,
            vec![SyncAction::Create {
                message_id: "m1".to_owned(),
                comment: NewComment {
                    path: "src/a.rs".to_owned(),
                    body: "why?".to_owned(),
                    side: Side::Right,
                    line: 12,
                    start_line: Some(10),
                },
            }]
        );
    }

    #[test]
    fn old_side_single_line_maps_to_left() {
        let s = snap(
            r#"{"version":1,"threads":[{"id":"t1","filePath":"a.rs",
                "position":{"side":"old","line":4},
                "messages":[{"id":"m1","body":"x","author":"User"}]}]}"#,
        );
        let actions = plan(
            &s,
            &HashSet::new(),
            &registry(&[("m1", SyncedComment::pending())]),
        );
        let SyncAction::Create { comment, .. } = &actions[0] else {
            panic!("expected a create: {actions:?}");
        };
        assert_eq!(
            (comment.side, comment.line, comment.start_line),
            (Side::Left, 4, None)
        );
    }

    #[test]
    fn reply_to_a_synced_root_uses_the_reply_endpoint() {
        let actions = plan(
            &snap(ROOT_AND_REPLY),
            &HashSet::new(),
            &registry(&[("m1", synced(99, "why?")), ("m2", SyncedComment::pending())]),
        );
        assert_eq!(
            actions,
            vec![SyncAction::Reply {
                message_id: "m2".to_owned(),
                in_reply_to: 99,
                body: "also this".to_owned(),
            }]
        );
    }

    #[test]
    fn reply_waits_while_its_root_is_still_pending() {
        let actions = plan(
            &snap(ROOT_AND_REPLY),
            &HashSet::new(),
            &registry(&[
                ("m1", SyncedComment::pending()),
                ("m2", SyncedComment::pending()),
            ]),
        );
        assert_eq!(actions.len(), 1, "{actions:?}");
        assert!(matches!(&actions[0], SyncAction::Create { message_id, .. } if message_id == "m1"));
    }

    #[test]
    fn github_reply_in_a_local_thread_becomes_a_new_comment() {
        let actions = plan(
            &snap(ROOT_AND_REPLY),
            &HashSet::new(),
            &registry(&[("m2", SyncedComment::pending())]),
        );
        assert!(
            matches!(&actions[0], SyncAction::Create { message_id, comment } if message_id == "m2" && comment.body == "also this"),
            "{actions:?}"
        );
    }

    #[test]
    fn edited_synced_comment_is_updated() {
        let actions = plan(
            &snap(ROOT_AND_REPLY),
            &HashSet::new(),
            &registry(&[("m1", synced(99, "old words"))]),
        );
        assert_eq!(
            actions,
            vec![SyncAction::Update {
                message_id: "m1".to_owned(),
                github_id: 99,
                body: "why?".to_owned(),
            }]
        );
    }

    #[test]
    fn unchanged_synced_comment_needs_nothing() {
        let actions = plan(
            &snap(ROOT_AND_REPLY),
            &HashSet::new(),
            &registry(&[("m1", synced(99, "why?"))]),
        );
        assert!(actions.is_empty(), "{actions:?}");
    }

    #[test]
    fn removed_synced_comment_is_deleted_only_once_seen_before() {
        let empty = snap(r#"{"version":4,"threads":[]}"#);
        let reg = registry(&[("m1", synced(99, "why?"))]);
        assert!(
            plan(&empty, &HashSet::new(), &reg).is_empty(),
            "a first or incomplete snapshot never deletes"
        );
        let previous = HashSet::from(["m1".to_owned()]);
        assert_eq!(
            plan(&empty, &previous, &reg),
            vec![SyncAction::Delete {
                message_id: "m1".to_owned(),
                github_id: 99,
            }]
        );
    }

    #[test]
    fn removed_unposted_comment_is_forgotten() {
        let empty = snap(r#"{"version":4,"threads":[]}"#);
        let previous = HashSet::from(["m1".to_owned()]);
        let actions = plan(
            &empty,
            &previous,
            &registry(&[("m1", SyncedComment::pending())]),
        );
        assert_eq!(
            actions,
            vec![SyncAction::Forget {
                message_id: "m1".to_owned()
            }]
        );
    }

    #[test]
    fn failed_comment_retries_only_after_an_edit() {
        let failed = SyncedComment {
            status: SyncStatus::Failed,
            body: Some("why?".to_owned()),
            error: Some("422".to_owned()),
            ..SyncedComment::pending()
        };
        let reg = registry(&[("m1", failed.clone())]);
        assert!(plan(&snap(ROOT_AND_REPLY), &HashSet::new(), &reg).is_empty());

        let edited = registry(&[(
            "m1",
            SyncedComment {
                body: Some("before".to_owned()),
                ..failed
            },
        )]);
        assert!(matches!(
            &plan(&snap(ROOT_AND_REPLY), &HashSet::new(), &edited)[0],
            SyncAction::Create { .. }
        ));
    }

    #[test]
    fn comment_without_a_line_is_rejected() {
        let s = snap(
            r#"{"version":1,"threads":[{"id":"t1","filePath":"a.rs","position":null,
                "messages":[{"id":"m1","body":"x","author":"User"}]}]}"#,
        );
        let actions = plan(
            &s,
            &HashSet::new(),
            &registry(&[("m1", SyncedComment::pending())]),
        );
        assert!(matches!(&actions[0], SyncAction::Reject { message_id, .. } if message_id == "m1"));
    }
}
