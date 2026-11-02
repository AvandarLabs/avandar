//! Tests for the sync pass when GitHub cannot be reached: nothing the reviewer
//! does is dropped, and all of it reaches GitHub once the connection is back.

use super::*;
use crate::github::registry::Removal;
use crate::github::session::PrState;

fn is_online(rig: &Rig) -> bool {
    rig.registry.read(|s| s.session.connection.is_online())
}

/// The network returns and the browser says so.
fn come_back_online(rig: &Rig) {
    rig.github.set_offline(false);
    rig.registry.session(|s| s.report_connection(true));
}

/// A rig whose PR was looked up (and first pull made) while online.
fn online_rig() -> Rig {
    let github = FakeGithub::default();
    github.remote.lock().unwrap().head_sha = "head".to_owned();
    let mut harness = rig(github, "develop");
    harness.sync.tick(&snapshot_from_json(EMPTY));
    harness
}

#[test]
fn a_comment_saved_after_the_connection_drops_stays_queued_then_posts() {
    let mut harness = online_rig();
    harness.github.set_offline(true);
    harness.registry.mark_pending(&["m1".to_owned()]);
    harness.sync.tick(&one_comment_snapshot("why?"));
    let entry = harness.registry.snapshot().comments["m1"].clone();
    assert_eq!(entry.status, SyncStatus::Pending);
    assert_eq!(entry.error, None);
    assert!(!is_online(&harness));

    come_back_online(&harness);
    harness.sync.tick(&one_comment_snapshot("why?"));
    assert_eq!(status(&harness, "m1"), SyncStatus::Draft);
}

#[test]
fn comments_saved_while_launched_offline_wait_for_the_pr_lookup() {
    let github = FakeGithub::default();
    github.set_offline(true);
    let mut harness = rig(github, "develop");
    harness.registry.mark_pending(&["m1".to_owned()]);
    harness.sync.tick(&one_comment_snapshot("why?"));
    assert_eq!(
        harness.registry.read(|s| s.session.pr.clone()),
        PrState::Unknown
    );
    assert_eq!(status(&harness, "m1"), SyncStatus::Pending);

    come_back_online(&harness);
    harness.sync.tick(&one_comment_snapshot("why?"));
    assert_eq!(status(&harness, "m1"), SyncStatus::Draft);
}

#[test]
fn no_github_calls_are_made_while_the_browser_reports_no_network() {
    let mut harness = online_rig();
    let calls_before = harness.github.calls().len();
    harness.registry.session(|s| s.report_connection(false));
    harness.registry.mark_pending(&["m1".to_owned()]);
    harness.registry.session(|s| s.pull_requested = true);
    harness.sync.tick(&one_comment_snapshot("why?"));
    assert_eq!(harness.github.calls().len(), calls_before);

    harness.registry.session(|s| s.report_connection(true));
    harness.sync.tick(&one_comment_snapshot("why?"));
    assert_eq!(status(&harness, "m1"), SyncStatus::Draft);
}

#[test]
fn a_lost_connection_the_browser_did_not_see_is_retried_after_an_interval() {
    let mut harness = online_rig();
    harness.github.set_offline(true);
    harness.registry.mark_pending(&["m1".to_owned()]);
    harness.sync.tick(&one_comment_snapshot("why?"));
    harness.github.set_offline(false);
    harness.sync.tick(&one_comment_snapshot("why?"));
    assert_eq!(status(&harness, "m1"), SyncStatus::Pending, "not due yet");

    harness.sync.retry_every = Duration::ZERO;
    harness.sync.tick(&one_comment_snapshot("why?"));
    assert_eq!(status(&harness, "m1"), SyncStatus::Draft);
    assert!(is_online(&harness));
}

#[test]
fn a_draft_deleted_offline_is_deleted_on_github_once_back() {
    let mut harness = online_rig();
    harness.registry.mark_pending(&["m1".to_owned()]);
    harness.sync.tick(&one_comment_snapshot("why?"));
    harness.github.set_offline(true);
    harness.sync.tick(&snapshot_from_json(EMPTY));
    harness.sync.tick(&snapshot_from_json(EMPTY));
    let entry = harness.registry.snapshot().comments["m1"].clone();
    assert_eq!(entry.removal, Some(Removal::Delete));
    assert_eq!(harness.registry.read(|s| s.registry.draft_count()), 0);

    come_back_online(&harness);
    harness.sync.tick(&snapshot_from_json(EMPTY));
    assert!(harness.github.calls().contains(&"delete C1".to_owned()));
    assert!(harness.registry.snapshot().comments.is_empty());
}

#[test]
fn a_published_thread_resolved_offline_is_resolved_on_github_once_back() {
    let mut harness = online_rig();
    harness.registry.mark_pending(&["m1".to_owned()]);
    harness.sync.tick(&one_comment_snapshot("why?"));
    harness
        .registry
        .update(|registry| registry.comments.get_mut("m1").unwrap().status = SyncStatus::Published);
    harness.registry.session(|s| s.report_connection(false));
    harness.sync.tick(&snapshot_from_json(EMPTY));
    harness.sync.tick(&snapshot_from_json(EMPTY));
    assert!(!harness.github.calls().contains(&"resolve T1".to_owned()));

    harness.registry.session(|s| s.report_connection(true));
    harness.sync.tick(&snapshot_from_json(EMPTY));
    assert!(harness.github.calls().contains(&"resolve T1".to_owned()));
    assert!(harness.registry.snapshot().comments.is_empty());
}

#[test]
fn viewed_changes_made_offline_reach_github_once_back() {
    let mut harness = online_rig();
    harness.github.set_offline(true);
    harness.registry.update(|registry| {
        registry.queued_viewed.insert("a.rs".to_owned(), true);
    });
    harness.sync.tick(&snapshot_from_json(EMPTY));
    assert_eq!(
        harness.registry.snapshot().queued_viewed.get("a.rs"),
        Some(&true)
    );

    come_back_online(&harness);
    harness.sync.tick(&snapshot_from_json(EMPTY));
    assert!(
        harness
            .github
            .calls()
            .contains(&"viewed a.rs true".to_owned())
    );
    assert!(harness.registry.snapshot().queued_viewed.is_empty());
}

#[test]
fn the_first_pull_does_not_undo_viewed_changes_still_queued() {
    let github = FakeGithub::default();
    github.remote.lock().unwrap().head_sha = "head".to_owned();
    github.remote.lock().unwrap().files = vec![("a.rs".to_owned(), ViewedState::Unviewed)];
    let mut harness = rig(github, "develop");
    harness.registry.update(|registry| {
        registry.queued_viewed.insert("a.rs".to_owned(), true);
    });
    harness.sync.tick(&snapshot_from_json(EMPTY));
    let events = harness.registry.read(|s| s.session.viewed.events.clone());
    assert!(
        events.iter().all(|event| event.path != "a.rs"),
        "{events:?}"
    );

    harness.sync.tick(&snapshot_from_json(EMPTY));
    assert!(
        harness
            .github
            .calls()
            .contains(&"viewed a.rs true".to_owned())
    );
}

#[test]
fn a_review_submitted_offline_is_submitted_once_back() {
    let mut harness = online_rig();
    harness.registry.mark_pending(&["m1".to_owned()]);
    harness.sync.tick(&one_comment_snapshot("why?"));
    harness.github.set_offline(true);
    harness.registry.session(|s| {
        s.submit = Some(SubmitRequest {
            event: ReviewEvent::Comment,
            body: String::new(),
        });
    });
    harness.sync.tick(&one_comment_snapshot("why?"));
    assert!(harness.registry.read(|s| s.session.submit.is_some()));
    assert_eq!(
        harness.registry.read(|s| s.session.last_submit.clone()),
        None
    );

    come_back_online(&harness);
    harness.sync.tick(&one_comment_snapshot("why?"));
    assert_eq!(status(&harness, "m1"), SyncStatus::Published);
    assert!(
        harness
            .registry
            .read(|s| s.session.last_submit.clone().unwrap().ok)
    );
}

#[test]
fn a_pull_that_cannot_reach_github_is_asked_again_not_reported_as_failed() {
    let mut harness = online_rig();
    harness.github.set_offline(true);
    harness.registry.session(|s| {
        s.pull_requested = true;
        s.reviewer_pull = true;
    });
    harness.sync.tick(&snapshot_from_json(EMPTY));
    let (error, asked, reviewer_asked, finished) = harness.registry.read(|s| {
        (
            s.session.pull_error.clone(),
            s.session.pull_requested,
            s.session.reviewer_pull,
            s.session.reviewer_pulls,
        )
    });
    assert_eq!(error, None);
    assert!(asked && reviewer_asked, "the Sync waits for the connection");
    assert_eq!(
        finished, 0,
        "the browser must not reload for a pull that never ran"
    );
}
