//! Tests for [`super`] (the persisted registry and the shared lock over it).

use super::*;
use crate::github::session::{PrState, ReviewEvent};

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
    assert_eq!(registry.unposted_count(), 1);
}

#[test]
fn a_draft_with_a_queued_removal_is_no_longer_counted_as_a_draft() {
    let mut registry = Registry::default();
    registry.comments.insert(
        "a".to_owned(),
        SyncedComment {
            status: SyncStatus::Draft,
            removal: Some(Removal::Delete),
            ..SyncedComment::pending()
        },
    );
    assert_eq!(registry.draft_count(), 0);
    assert_eq!(registry.queued_removal_count(), 1);
}

#[test]
fn a_queued_submit_persists_and_reloads() {
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("r-github.json");
    SharedRegistry::load(path.clone()).update(|registry| {
        registry.queued_submit = Some(SubmitRequest {
            event: ReviewEvent::Approve,
            body: "LGTM".to_owned(),
        });
    });
    let text = fs::read_to_string(&path).unwrap();
    assert!(text.contains("\"APPROVE\""), "{text}");
    assert_eq!(
        SharedRegistry::load(path).snapshot().queued_submit,
        Some(SubmitRequest {
            event: ReviewEvent::Approve,
            body: "LGTM".to_owned(),
        })
    );
}

#[test]
fn queued_viewed_changes_persist_and_reload() {
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("r-github.json");
    SharedRegistry::load(path.clone()).update(|registry| {
        registry.queued_viewed.insert("a.rs".to_owned(), true);
    });
    let text = fs::read_to_string(&path).unwrap();
    assert!(text.contains("\"queuedViewed\""), "{text}");
    assert_eq!(
        SharedRegistry::load(path)
            .snapshot()
            .queued_viewed
            .get("a.rs"),
        Some(&true)
    );
}
