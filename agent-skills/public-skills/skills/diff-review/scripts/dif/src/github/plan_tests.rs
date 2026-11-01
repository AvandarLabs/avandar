//! Tests for [`super`] (the push planner), kept beside it so the module stays
//! readable.

use super::*;
use crate::github::anchor::Side;
use crate::github::fakes::{registry_from_entries, snapshot_from_json, synced_comment_on_github};

fn no_previous_snapshot() -> Previous {
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
        &snapshot_from_json(ROOT_AND_REPLY),
        &no_previous_snapshot(),
        &registry_from_entries(&[("m1", SyncedComment::pending())]),
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
            &snapshot_from_json(ROOT_AND_REPLY),
            &no_previous_snapshot(),
            &registry_from_entries(&[
                ("m1", synced_comment_on_github(status, "C1", true, "why?")),
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
        &snapshot_from_json(ROOT_AND_REPLY),
        &no_previous_snapshot(),
        &registry_from_entries(&[
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
        &snapshot_from_json(ROOT_AND_REPLY),
        &no_previous_snapshot(),
        &registry_from_entries(&[("m2", SyncedComment::pending())]),
    );
    assert!(
        matches!(&actions[0], SyncAction::AddThread { message_id, comment } if message_id == "m2" && comment.body == "also this"),
        "{actions:?}"
    );
}

#[test]
fn edited_comment_is_updated_and_unchanged_needs_nothing() {
    let edited = registry_from_entries(&[(
        "m1",
        synced_comment_on_github(SyncStatus::Draft, "C1", true, "old"),
    )]);
    assert_eq!(
        plan(
            &snapshot_from_json(ROOT_ONLY),
            &no_previous_snapshot(),
            &edited
        ),
        vec![SyncAction::Update {
            message_id: "m1".to_owned(),
            node_id: "C1".to_owned(),
            body: "why?".to_owned(),
        }]
    );
    let same = registry_from_entries(&[(
        "m1",
        synced_comment_on_github(SyncStatus::Published, "C1", true, "why?"),
    )]);
    assert!(
        plan(
            &snapshot_from_json(ROOT_ONLY),
            &no_previous_snapshot(),
            &same
        )
        .is_empty()
    );
}

#[test]
fn nothing_is_removed_unless_the_previous_snapshot_held_it() {
    let reg = registry_from_entries(&[(
        "m1",
        synced_comment_on_github(SyncStatus::Published, "C1", true, "why?"),
    )]);
    assert!(plan(&snapshot_from_json(EMPTY), &no_previous_snapshot(), &reg).is_empty());
}

#[test]
fn removing_a_published_thread_resolves_it_and_forgets_its_replies() {
    let reg = registry_from_entries(&[
        (
            "m1",
            synced_comment_on_github(SyncStatus::Published, "C1", true, "why?"),
        ),
        (
            "m2",
            synced_comment_on_github(SyncStatus::Published, "C2", false, "also this"),
        ),
    ]);
    let previous = Previous::from_snapshot(&snapshot_from_json(ROOT_AND_REPLY));
    let actions = plan(&snapshot_from_json(EMPTY), &previous, &reg);
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
    let reg = registry_from_entries(&[
        (
            "m1",
            synced_comment_on_github(SyncStatus::Draft, "C1", true, "why?"),
        ),
        (
            "m2",
            synced_comment_on_github(SyncStatus::Draft, "C2", false, "also this"),
        ),
    ]);
    let previous = Previous::from_snapshot(&snapshot_from_json(ROOT_AND_REPLY));
    let actions = plan(&snapshot_from_json(EMPTY), &previous, &reg);
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
    let reg = registry_from_entries(&[
        (
            "m1",
            synced_comment_on_github(SyncStatus::Published, "C1", true, "why?"),
        ),
        (
            "m2",
            synced_comment_on_github(SyncStatus::Published, "C2", false, "also this"),
        ),
    ]);
    let previous = Previous::from_snapshot(&snapshot_from_json(ROOT_AND_REPLY));
    assert_eq!(
        plan(&snapshot_from_json(ROOT_ONLY), &previous, &reg),
        vec![SyncAction::Delete {
            message_id: "m2".to_owned(),
            node_id: "C2".to_owned(),
        }]
    );
}

#[test]
fn removed_unposted_comment_is_forgotten() {
    let previous = Previous::from_snapshot(&snapshot_from_json(ROOT_ONLY));
    let actions = plan(
        &snapshot_from_json(EMPTY),
        &previous,
        &registry_from_entries(&[("m1", SyncedComment::pending())]),
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
    let reg = registry_from_entries(&[("m1", failed.clone())]);
    assert!(
        plan(
            &snapshot_from_json(ROOT_ONLY),
            &no_previous_snapshot(),
            &reg
        )
        .is_empty()
    );

    let edited = registry_from_entries(&[(
        "m1",
        SyncedComment {
            body: Some("before".to_owned()),
            ..failed
        },
    )]);
    assert!(matches!(
        &plan(
            &snapshot_from_json(ROOT_ONLY),
            &no_previous_snapshot(),
            &edited
        )[0],
        SyncAction::AddThread { .. }
    ));
}

#[test]
fn comment_without_a_line_is_rejected() {
    let s = snapshot_from_json(
        r#"{"version":1,"threads":[{"id":"t1","filePath":"a.rs","position":null,
            "messages":[{"id":"m1","body":"x","author":"User"}]}]}"#,
    );
    let actions = plan(
        &s,
        &no_previous_snapshot(),
        &registry_from_entries(&[("m1", SyncedComment::pending())]),
    );
    assert!(matches!(&actions[0], SyncAction::Reject { message_id, .. } if message_id == "m1"));
}
