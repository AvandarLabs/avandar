//! Tests for [`super`] (the session state and its browser JSON).

use super::*;

fn pr(author: &str) -> PullRequest {
    PullRequest {
        number: 7,
        url: "https://github.com/o/r/pull/7".to_owned(),
        node_id: "PR_1".to_owned(),
        head_sha: "abc".to_owned(),
        base_ref: "develop".to_owned(),
        author: author.to_owned(),
    }
}

#[test]
fn own_pr_needs_a_matching_viewer() {
    let mut session = Session::new();
    session.pr = PrState::Available(pr("jpsyx"));
    assert!(!session.is_own_pr(), "viewer unknown");
    session.viewer = Some("jpsyx".to_owned());
    assert!(session.is_own_pr());
    session.viewer = Some("someone".to_owned());
    assert!(!session.is_own_pr());
}

#[test]
fn state_json_reports_availability_and_ownership() {
    let mut session = Session::new();
    let state = session.state_json(&Registry::default());
    assert_eq!(state["available"], false);
    assert_eq!(state["lookedUp"], false);

    session.pr = PrState::Available(pr("alice"));
    session.viewer = Some("jpsyx".to_owned());
    let state = session.state_json(&Registry::default());
    assert_eq!(state["available"], true);
    assert_eq!(state["pr"]["isOwn"], false);
    assert_eq!(state["pr"]["number"], 7);
}

#[test]
fn answering_conflicts_hands_them_to_the_llm_or_leaves_them_to_the_reviewer() {
    let conflicted = || Some(vec!["a.rs".to_owned()]);
    let mut session = Session::new();
    session.conflicts = conflicted();
    session.answer_conflicts(ConflictResolution::Llm);
    assert_eq!(session.conflicts, None);
    assert_eq!(session.conflicts_for_llm, conflicted());
    assert!(session.notice.unwrap().contains("LLM"));

    let mut session = Session::new();
    session.conflicts = conflicted();
    session.answer_conflicts(ConflictResolution::Reviewer);
    assert_eq!(session.conflicts, None);
    assert_eq!(session.conflicts_for_llm, None);
    let notice = session.notice.unwrap();
    assert!(notice.contains("git stash drop"), "{notice}");
}

#[test]
fn state_json_carries_open_conflicts_and_finished_reviewer_pulls() {
    let mut session = Session::new();
    let state = session.state_json(&Registry::default());
    assert!(state["conflicts"].is_null());
    assert_eq!(state["sync"]["reviewerPulls"], 0);

    session.conflicts = Some(vec!["a.rs".to_owned()]);
    session.reviewer_pulls = 2;
    let state = session.state_json(&Registry::default());
    assert_eq!(state["conflicts"], serde_json::json!(["a.rs"]));
    assert_eq!(state["sync"]["reviewerPulls"], 2);
}

#[test]
fn state_json_reports_the_connection_and_everything_still_queued() {
    use crate::github::registry::{Removal, SyncedComment};

    let mut registry = Registry::default();
    registry
        .comments
        .insert("a".to_owned(), SyncedComment::pending());
    registry.comments.insert(
        "b".to_owned(),
        SyncedComment {
            status: crate::github::registry::SyncStatus::Draft,
            removal: Some(Removal::Delete),
            ..SyncedComment::pending()
        },
    );
    registry.queued_viewed.insert("a.rs".to_owned(), true);
    let mut session = Session::new();
    session.report_connection(false);
    registry.queued_submit = Some(SubmitRequest {
        event: ReviewEvent::Comment,
        body: String::new(),
    });
    let state = session.state_json(&registry);
    assert_eq!(state["connection"]["online"], false);
    assert_eq!(state["connection"]["browserOffline"], true);
    assert_eq!(
        state["queued"],
        serde_json::json!({"comments": 1, "removals": 1, "viewed": 1, "submit": true})
    );
}

#[test]
fn coming_back_online_pulls_at_once() {
    let mut session = Session::new();
    session.report_connection(false);
    assert!(!session.pull_requested);
    session.report_connection(true);
    assert!(session.pull_requested);
}

#[test]
fn a_reviewer_resync_asks_for_a_pull_that_may_stash() {
    let mut session = Session::new();
    session.pr = PrState::Available(pr("jpsyx"));
    assert!(session.request_reviewer_pull());
    assert!(session.pull_requested);
    assert!(session.reviewer_pull);
}

#[test]
fn a_reviewer_resync_asks_nothing_when_the_branch_has_no_pr() {
    let mut session = Session::new();
    session.pr = PrState::Unavailable("no PR".to_owned());
    assert!(!session.request_reviewer_pull());
    assert!(!session.pull_requested);
    assert!(!session.reviewer_pull);
}

#[test]
fn viewed_events_are_numbered_and_capped() {
    let mut viewed = ViewedSync::default();
    viewed.push_events((0..MAX_VIEWED_EVENTS + 5).map(|i| (format!("f{i}"), true)));
    assert_eq!(viewed.events.len(), MAX_VIEWED_EVENTS);
    assert_eq!(
        viewed.events.last().unwrap().seq,
        (MAX_VIEWED_EVENTS + 5) as u64
    );
}

#[test]
fn review_events_round_trip() {
    for event in [
        ReviewEvent::Comment,
        ReviewEvent::Approve,
        ReviewEvent::RequestChanges,
    ] {
        assert_eq!(ReviewEvent::parse(event.as_github()), Some(event));
    }
    assert_eq!(ReviewEvent::parse("MERGE"), None);
}
