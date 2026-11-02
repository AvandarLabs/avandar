//! Tests for [`super`] (the sync pass), driven through fakes of GitHub, the
//! checkout, and difit.

use std::sync::{Arc, Mutex};
use std::time::Duration;

use super::*;
use crate::difit::editor::DifitEdit;
use crate::github::checkout::Relation;
use crate::github::fakes::{FakeCheckout, FakeEditor, FakeGithub, snapshot_from_json};
use crate::github::graphql::{RemoteComment, RemoteState, RemoteThread};
use crate::github::session::{ReviewEvent, SubmitRequest, ViewedState};

struct Rig {
    _dir: tempfile::TempDir,
    github: FakeGithub,
    checkout: FakeCheckout,
    editor: FakeEditor,
    registry: SharedRegistry,
    sync: GithubSync,
}

fn rig(github: FakeGithub, comparison: &str) -> Rig {
    rig_with(github, comparison, "head", Relation::Same, true)
}

fn rig_with(
    github: FakeGithub,
    comparison: &str,
    head: &str,
    relation: Relation,
    clean: bool,
) -> Rig {
    let dir = tempfile::tempdir().unwrap();
    let registry = SharedRegistry::load(dir.path().join("r-github.json"));
    let checkout = FakeCheckout {
        head: Arc::new(Mutex::new(head.to_owned())),
        relation,
        clean,
        conflicts: Arc::default(),
        stash_log: Arc::default(),
    };
    let editor = FakeEditor::default();
    let ports = SyncPorts {
        api: Box::new(github.clone()),
        checkout: Box::new(checkout.clone()),
        editor: Box::new(editor.clone()),
    };
    let sync = GithubSync::new(registry.clone(), ComparisonKey::parse(comparison), ports);
    Rig {
        _dir: dir,
        github,
        checkout,
        editor,
        registry,
        sync,
    }
}

fn one_comment_snapshot(body: &str) -> Snapshot {
    snapshot_from_json(&format!(
        r#"{{"version":1,"threads":[{{"id":"t1","filePath":"a.rs",
            "position":{{"side":"new","line":5}},
            "messages":[{{"id":"m1","body":"{body}","author":"User"}}]}}]}}"#
    ))
}

const EMPTY: &str = r#"{"version":0,"threads":[]}"#;

fn queue_submit(rig: &Rig, event: ReviewEvent, body: impl Into<String>) {
    rig.registry.update(|registry| {
        registry.queued_submit = Some(SubmitRequest {
            event,
            body: body.into(),
        });
    });
}

fn status(rig: &Rig, id: &str) -> SyncStatus {
    rig.registry.snapshot().comments[id].status
}

#[test]
fn a_pr_comment_becomes_a_draft_then_publishes_on_submit() {
    let mut harness = rig(FakeGithub::default(), "develop");
    harness.registry.mark_pending(&["m1".to_owned()]);
    harness.sync.tick(&one_comment_snapshot("why?"));
    assert_eq!(status(&harness, "m1"), SyncStatus::Draft);

    queue_submit(&harness, ReviewEvent::Approve, "LGTM".to_owned());
    harness.sync.tick(&one_comment_snapshot("why?"));
    assert_eq!(status(&harness, "m1"), SyncStatus::Published);
    let calls = harness.github.calls();
    assert!(calls.contains(&"create_review".to_owned()), "{calls:?}");
    assert!(calls.contains(&"add_thread R1 a.rs:5".to_owned()));
    assert!(calls.contains(&"submit R1 APPROVE LGTM".to_owned()));
    assert!(
        harness
            .registry
            .read(|s| s.session.last_submit.clone().unwrap().ok)
    );
}

#[test]
fn edits_and_deletes_mirror_and_a_removed_published_thread_resolves() {
    let mut harness = rig(FakeGithub::default(), "develop");
    harness.registry.mark_pending(&["m1".to_owned()]);
    harness.sync.tick(&one_comment_snapshot("why?"));
    harness.sync.tick(&one_comment_snapshot("why not?"));
    harness
        .registry
        .update(|registry| registry.comments.get_mut("m1").unwrap().status = SyncStatus::Published);
    harness.sync.tick(&snapshot_from_json(EMPTY));
    let calls = harness.github.calls();
    assert!(
        calls.contains(&"update C1 why not?".to_owned()),
        "{calls:?}"
    );
    assert!(calls.contains(&"resolve T1".to_owned()), "{calls:?}");
    assert!(harness.registry.snapshot().comments.is_empty());
}

#[test]
fn own_pr_cannot_be_approved() {
    let mut harness = rig(
        FakeGithub {
            author: Some("jpsyx".to_owned()),
            ..FakeGithub::default()
        },
        "develop",
    );
    harness.sync.tick(&snapshot_from_json(EMPTY));
    queue_submit(&harness, ReviewEvent::Approve, String::new());
    harness.sync.tick(&snapshot_from_json(EMPTY));
    let outcome = harness
        .registry
        .read(|s| s.session.last_submit.clone().unwrap());
    assert!(
        !outcome.ok && outcome.message.contains("own PR"),
        "{outcome:?}"
    );
}

#[test]
fn submit_refuses_while_comments_have_failed() {
    let mut harness = rig(
        FakeGithub {
            fail_thread: true,
            ..FakeGithub::default()
        },
        "develop",
    );
    harness.registry.mark_pending(&["m1".to_owned()]);
    harness.sync.tick(&one_comment_snapshot("why?"));
    assert_eq!(status(&harness, "m1"), SyncStatus::Failed);
    queue_submit(&harness, ReviewEvent::Comment, String::new());
    harness.sync.tick(&one_comment_snapshot("why?"));
    let outcome = harness
        .registry
        .read(|s| s.session.last_submit.clone().unwrap());
    assert!(!outcome.ok && outcome.message.contains("failed to post"));
}

#[test]
fn no_pr_fails_comments_and_reports_why() {
    let mut harness = rig(
        FakeGithub {
            no_pr: true,
            ..FakeGithub::default()
        },
        "develop",
    );
    harness.registry.mark_pending(&["m1".to_owned()]);
    harness.sync.tick(&one_comment_snapshot("why?"));
    let entry = harness.registry.snapshot().comments["m1"].clone();
    assert_eq!(entry.status, SyncStatus::Failed);
    assert!(entry.error.unwrap().starts_with("No linked PR"));
    let state = harness.registry.read(|s| s.session.state_json(&s.registry));
    assert_eq!(state["available"], false);
    assert!(
        state["reason"]
            .as_str()
            .unwrap()
            .contains("no pull requests")
    );
}

fn remote_thread() -> RemoteThread {
    RemoteThread {
        node_id: "T9".to_owned(),
        resolved: false,
        path: "a.rs".to_owned(),
        side: crate::github::anchor::Side::Right,
        line: 2,
        start_line: None,
        comments: vec![RemoteComment {
            node_id: "C9".to_owned(),
            body: "from a bot".to_owned(),
            url: "u".to_owned(),
            author: "coderabbitai[bot]".to_owned(),
            viewer_did_author: false,
            pending: false,
            created_at: "t0".to_owned(),
            updated_at: "t0".to_owned(),
        }],
        complete: true,
    }
}

#[test]
fn a_pull_imports_remote_comments_and_keeps_them_from_the_llm() {
    let github = FakeGithub::default();
    *github.remote.lock().unwrap() = RemoteState {
        head_sha: "head".to_owned(),
        threads: vec![remote_thread()],
        ..RemoteState::default()
    };
    let mut harness = rig(github, "develop");
    harness.sync.tick(&snapshot_from_json(EMPTY));
    assert!(harness.github.calls().contains(&"fetch".to_owned()));
    assert!(
        matches!(&harness.editor.0.lock().unwrap()[0], DifitEdit::AddThread(t) if t["id"] == "gh:C9")
    );
    assert!(harness.registry.github_ids().contains("gh:C9"));
}

#[test]
fn viewed_files_sync_both_ways_only_against_the_prs_base() {
    let github = FakeGithub::default();
    github.remote.lock().unwrap().head_sha = "head".to_owned();
    github.remote.lock().unwrap().files = vec![
        ("a.rs".to_owned(), ViewedState::Viewed),
        ("b.rs".to_owned(), ViewedState::Unviewed),
    ];
    let mut synced = rig(github, "develop");
    synced.sync.tick(&snapshot_from_json(EMPTY));
    let events = synced.registry.read(|s| s.session.viewed.events.clone());
    assert_eq!(events.len(), 2, "GitHub wins on the first pull");

    synced.registry.update(|registry| {
        registry.queued_viewed.extend([
            ("a.rs".to_owned(), true),
            ("b.rs".to_owned(), true),
            ("c.rs".to_owned(), true),
        ]);
    });
    synced.sync.tick(&snapshot_from_json(EMPTY));
    let viewed: Vec<_> = synced
        .github
        .calls()
        .into_iter()
        .filter(|c| c.starts_with("viewed"))
        .collect();
    assert_eq!(
        viewed,
        vec!["viewed b.rs true", "viewed c.rs true"],
        "one call per file, none for no-ops"
    );
    assert!(synced.registry.snapshot().queued_viewed.is_empty());

    let mut other = rig(FakeGithub::default(), ".");
    other.sync.tick(&snapshot_from_json(EMPTY));
    let (active, reason) = other
        .registry
        .read(|s| (s.session.viewed.active, s.session.viewed.reason.clone()));
    assert!(!active && reason.unwrap().contains("develop"));
}

#[test]
fn a_clean_branch_behind_the_pr_fast_forwards_and_a_dirty_one_is_told_why() {
    let github = FakeGithub::default();
    github.remote.lock().unwrap().head_sha = "new-head".to_owned();
    let mut behind = rig_with(github.clone(), "develop", "old", Relation::Behind, true);
    behind.sync.tick(&snapshot_from_json(EMPTY));
    assert_eq!(behind.checkout.head().as_deref(), Some("new-head"));
    assert_eq!(behind.registry.read(|s| s.session.fast_forwards), 1);

    let mut dirty = rig_with(github, "develop", "old", Relation::Behind, false);
    dirty.sync.tick(&snapshot_from_json(EMPTY));
    assert_eq!(dirty.checkout.head().as_deref(), Some("old"));
    assert!(
        dirty.checkout.stash_calls().is_empty(),
        "a background pull never stashes"
    );
    let notice = dirty.registry.read(|s| s.session.notice.clone()).unwrap();
    assert!(notice.contains("stash"), "{notice}");
}

/// A dirty branch behind the PR, with the reviewer having clicked Sync.
fn reviewer_sync_on_a_dirty_branch(conflicts: &[&str]) -> Rig {
    let github = FakeGithub::default();
    github.remote.lock().unwrap().head_sha = "new-head".to_owned();
    let mut harness = rig_with(github, "develop", "old", Relation::Behind, false);
    *harness.checkout.conflicts.lock().unwrap() = conflicts.iter().map(|&f| f.to_owned()).collect();
    harness.registry.session(|s| {
        s.pull_requested = true;
        s.reviewer_pull = true;
    });
    harness.sync.tick(&snapshot_from_json(EMPTY));
    harness
}

#[test]
fn a_reviewer_sync_stashes_pulls_and_restores_a_dirty_branch() {
    let harness = reviewer_sync_on_a_dirty_branch(&[]);
    assert_eq!(harness.checkout.head().as_deref(), Some("new-head"));
    assert_eq!(harness.checkout.stash_calls(), ["stash", "pop"]);
    harness.registry.read(|s| {
        assert_eq!(s.session.fast_forwards, 1);
        assert_eq!(s.session.reviewer_pulls, 1);
        assert!(!s.session.reviewer_pull, "the request is used up");
        assert_eq!(s.session.notice, None);
        assert_eq!(s.session.conflicts, None);
    });
}

#[test]
fn conflicts_from_restoring_the_stash_wait_for_the_reviewers_answer() {
    let harness = reviewer_sync_on_a_dirty_branch(&["a.rs", "b.rs"]);
    assert_eq!(harness.checkout.head().as_deref(), Some("new-head"));
    harness.registry.read(|s| {
        assert_eq!(s.session.fast_forwards, 1);
        assert_eq!(s.session.reviewer_pulls, 1);
        assert_eq!(
            s.session.conflicts,
            Some(vec!["a.rs".to_owned(), "b.rs".to_owned()])
        );
        let notice = s.session.notice.clone().unwrap();
        assert!(notice.contains("2 files"), "{notice}");
    });
}

#[test]
fn pulls_happen_on_request_and_on_the_interval_only() {
    let mut harness = rig(FakeGithub::default(), "develop");
    harness.sync.tick(&snapshot_from_json(EMPTY));
    harness.sync.tick(&snapshot_from_json(EMPTY));
    let fetches = |rig: &Rig| rig.github.calls().iter().filter(|c| *c == "fetch").count();
    assert_eq!(
        fetches(&harness),
        1,
        "the first pull, then nothing until due"
    );
    harness.registry.session(|s| s.pull_requested = true);
    harness.sync.tick(&snapshot_from_json(EMPTY));
    assert_eq!(fetches(&harness), 2);
}

#[path = "sync_offline_tests.rs"]
mod offline;
