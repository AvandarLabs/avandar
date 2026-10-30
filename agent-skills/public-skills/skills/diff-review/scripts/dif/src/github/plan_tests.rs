//! Tests for [`super`] (the push planner), kept beside it so the module stays
//! readable.

use super::*;
use crate::github::anchor::Side;

fn snap(json: &str) -> Snapshot {
    serde_json::from_str(json).expect("valid snapshot")
}

fn registry(entries: &[(&str, SyncedComment)]) -> Registry {
    Registry {
        comments: entries
            .iter()
            .map(|(id, entry)| ((*id).to_owned(), entry.clone()))
            .collect(),
    }
}

fn on_github(status: SyncStatus, node: &str, root: bool, body: &str) -> SyncedComment {
    SyncedComment {
        status,
        node_id: Some(node.to_owned()),
        thread_id: Some("T1".to_owned()),
        root,
        body: Some(body.to_owned()),
        ..SyncedComment::pending()
    }
}

fn none() -> Previous {
    Previous::default()
}

const ROOT_AND_REPLY: &str = r#"{"version":3,"threads":[{"id":"t1","filePath":"src/a.rs",
    "position":{"side":"new","line":{"start":10,"end":12}},
    "messages":[{"id":"m1","body":"why?","author":"User"},
                {"id":"m2","body":"also this","author":"User"}]}]}"#;

const ROOT_ONLY: &str = r#"{"version":4,"threads":[{"id":"t1","filePath":"src/a.rs",
    "position":{"side":"new","line":12},
    "messages":[{"id":"m1","body":"why?","author":"User"}]}]}"#;

const EMPTY: &str = r#"{"version":5,"threads":[]}"#;

#[test]
fn pending_root_opens_a_draft_thread_at_its_range() {
    let actions = plan(
        &snap(ROOT_AND_REPLY),
        &none(),
        &registry(&[("m1", SyncedComment::pending())]),
    );
    assert_eq!(
        actions,
        vec![SyncAction::AddThread {
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
fn reply_under_a_thread_on_github_is_a_draft_reply() {
    for status in [SyncStatus::Draft, SyncStatus::Published] {
        let actions = plan(
            &snap(ROOT_AND_REPLY),
            &none(),
            &registry(&[
                ("m1", on_github(status, "C1", true, "why?")),
                ("m2", SyncedComment::pending()),
            ]),
        );
        assert_eq!(
            actions,
            vec![SyncAction::AddReply {
                message_id: "m2".to_owned(),
                thread_id: "T1".to_owned(),
                body: "also this".to_owned(),
            }]
        );
    }
}

#[test]
fn reply_waits_while_its_root_is_still_pending() {
    let actions = plan(
        &snap(ROOT_AND_REPLY),
        &none(),
        &registry(&[
            ("m1", SyncedComment::pending()),
            ("m2", SyncedComment::pending()),
        ]),
    );
    assert_eq!(actions.len(), 1, "{actions:?}");
    assert!(matches!(&actions[0], SyncAction::AddThread { message_id, .. } if message_id == "m1"));
}

#[test]
fn pr_reply_in_a_local_thread_opens_its_own_thread() {
    let actions = plan(
        &snap(ROOT_AND_REPLY),
        &none(),
        &registry(&[("m2", SyncedComment::pending())]),
    );
    assert!(
        matches!(&actions[0], SyncAction::AddThread { message_id, comment } if message_id == "m2" && comment.body == "also this"),
        "{actions:?}"
    );
}

#[test]
fn edited_comment_is_updated_and_unchanged_needs_nothing() {
    let edited = registry(&[("m1", on_github(SyncStatus::Draft, "C1", true, "old"))]);
    assert_eq!(
        plan(&snap(ROOT_ONLY), &none(), &edited),
        vec![SyncAction::Update {
            message_id: "m1".to_owned(),
            node_id: "C1".to_owned(),
            body: "why?".to_owned(),
        }]
    );
    let same = registry(&[("m1", on_github(SyncStatus::Published, "C1", true, "why?"))]);
    assert!(plan(&snap(ROOT_ONLY), &none(), &same).is_empty());
}

#[test]
fn nothing_is_removed_unless_the_previous_snapshot_held_it() {
    let reg = registry(&[("m1", on_github(SyncStatus::Published, "C1", true, "why?"))]);
    assert!(plan(&snap(EMPTY), &none(), &reg).is_empty());
}

#[test]
fn removing_a_published_thread_resolves_it_and_forgets_its_replies() {
    let reg = registry(&[
        ("m1", on_github(SyncStatus::Published, "C1", true, "why?")),
        (
            "m2",
            on_github(SyncStatus::Published, "C2", false, "also this"),
        ),
    ]);
    let previous = Previous::from_snapshot(&snap(ROOT_AND_REPLY));
    let actions = plan(&snap(EMPTY), &previous, &reg);
    assert_eq!(
        actions,
        vec![
            SyncAction::Resolve {
                message_id: "m1".to_owned(),
                thread_id: "T1".to_owned(),
            },
            SyncAction::Forget {
                message_id: "m2".to_owned()
            },
        ]
    );
}

#[test]
fn removing_a_draft_thread_deletes_its_drafts() {
    let reg = registry(&[
        ("m1", on_github(SyncStatus::Draft, "C1", true, "why?")),
        ("m2", on_github(SyncStatus::Draft, "C2", false, "also this")),
    ]);
    let previous = Previous::from_snapshot(&snap(ROOT_AND_REPLY));
    let actions = plan(&snap(EMPTY), &previous, &reg);
    assert!(
        actions
            .iter()
            .all(|a| matches!(a, SyncAction::Delete { .. })),
        "{actions:?}"
    );
    assert_eq!(actions.len(), 2);
}

#[test]
fn deleting_one_reply_deletes_it_on_github() {
    let reg = registry(&[
        ("m1", on_github(SyncStatus::Published, "C1", true, "why?")),
        (
            "m2",
            on_github(SyncStatus::Published, "C2", false, "also this"),
        ),
    ]);
    let previous = Previous::from_snapshot(&snap(ROOT_AND_REPLY));
    assert_eq!(
        plan(&snap(ROOT_ONLY), &previous, &reg),
        vec![SyncAction::Delete {
            message_id: "m2".to_owned(),
            node_id: "C2".to_owned(),
        }]
    );
}

#[test]
fn removed_unposted_comment_is_forgotten() {
    let previous = Previous::from_snapshot(&snap(ROOT_ONLY));
    let actions = plan(
        &snap(EMPTY),
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
    assert!(plan(&snap(ROOT_ONLY), &none(), &reg).is_empty());

    let edited = registry(&[(
        "m1",
        SyncedComment {
            body: Some("before".to_owned()),
            ..failed
        },
    )]);
    assert!(matches!(
        &plan(&snap(ROOT_ONLY), &none(), &edited)[0],
        SyncAction::AddThread { .. }
    ));
}

#[test]
fn comment_without_a_line_is_rejected() {
    let s = snap(
        r#"{"version":1,"threads":[{"id":"t1","filePath":"a.rs","position":null,
            "messages":[{"id":"m1","body":"x","author":"User"}]}]}"#,
    );
    let actions = plan(&s, &none(), &registry(&[("m1", SyncedComment::pending())]));
    assert!(matches!(&actions[0], SyncAction::Reject { message_id, .. } if message_id == "m1"));
}
