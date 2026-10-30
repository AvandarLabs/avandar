//! Tests for [`super`] (the pull reconciler), kept beside it so the module
//! stays readable.

use super::*;

fn snap(json: &str) -> Snapshot {
    serde_json::from_str(json).expect("valid snapshot")
}

fn comment(node: &str, body: &str) -> RemoteComment {
    RemoteComment {
        node_id: node.to_owned(),
        body: body.to_owned(),
        url: format!("https://x/{node}"),
        author: "alice".to_owned(),
        viewer_did_author: false,
        pending: false,
        created_at: "t0".to_owned(),
        updated_at: "t1".to_owned(),
    }
}

fn thread(node: &str, comments: Vec<RemoteComment>) -> RemoteThread {
    RemoteThread {
        node_id: node.to_owned(),
        resolved: false,
        path: "a.rs".to_owned(),
        side: Side::Right,
        line: 12,
        start_line: Some(10),
        comments,
        complete: true,
    }
}

fn remote(threads: Vec<RemoteThread>) -> RemoteState {
    RemoteState {
        head_sha: "abc".to_owned(),
        has_pending_review: false,
        threads,
        files: Vec::new(),
    }
}

fn known(node: &str, body: &str, root: bool) -> SyncedComment {
    SyncedComment {
        status: SyncStatus::Published,
        node_id: Some(node.to_owned()),
        thread_id: Some("T1".to_owned()),
        root,
        body: Some(body.to_owned()),
        ..SyncedComment::pending()
    }
}

fn registry(entries: &[(&str, SyncedComment)]) -> Registry {
    Registry {
        comments: entries
            .iter()
            .map(|(id, e)| ((*id).to_owned(), e.clone()))
            .collect(),
    }
}

const EMPTY: &str = r#"{"version":1,"threads":[]}"#;

const LOCAL_THREAD: &str = r#"{"version":2,"threads":[{"id":"m1","filePath":"a.rs",
    "position":{"side":"new","line":12},
    "messages":[{"id":"m1","body":"why?","author":"User"},
                {"id":"m2","body":"done","author":"claude"}]}]}"#;

#[test]
fn new_remote_thread_is_added_under_its_authors() {
    let mut bot = comment("C2", "nit");
    bot.author = "coderabbitai[bot]".to_owned();
    let mut mine = comment("C3", "draft reply");
    mine.viewer_did_author = true;
    mine.pending = true;
    let plan = reconcile(
        &remote(vec![thread("T1", vec![comment("C1", "why?"), bot, mine])]),
        &Registry::default(),
        &snap(EMPTY),
    );

    let DifitEdit::AddThread(added) = &plan.edits[0] else {
        panic!("expected a new thread: {:?}", plan.edits);
    };
    assert_eq!(added["id"], "gh:C1");
    assert_eq!(added["position"]["line"], json!({"start": 10, "end": 12}));
    assert_eq!(added["messages"][0]["author"], "alice");
    let authors: Vec<_> = plan.edits[1..]
        .iter()
        .map(|e| match e {
            DifitEdit::AddMessage { thread_id, message } => {
                assert_eq!(thread_id, "gh:C1");
                message["author"].as_str().unwrap().to_owned()
            }
            other => panic!("expected a reply: {other:?}"),
        })
        .collect();
    assert_eq!(authors, vec!["coderabbitai[bot]", "User"]);

    let statuses: Vec<_> = plan.upserts.iter().map(|(_, e)| e.status).collect();
    assert_eq!(
        statuses,
        vec![
            SyncStatus::Published,
            SyncStatus::Published,
            SyncStatus::Draft
        ]
    );
    assert!(plan.upserts[0].1.root && !plan.upserts[1].1.root);
}

#[test]
fn a_reply_on_github_lands_in_the_matching_local_thread() {
    let plan = reconcile(
        &remote(vec![thread(
            "T1",
            vec![comment("C1", "why?"), comment("C9", "because")],
        )]),
        &registry(&[("m1", known("C1", "why?", true))]),
        &snap(LOCAL_THREAD),
    );
    assert_eq!(
        plan.edits,
        vec![DifitEdit::AddMessage {
            thread_id: "m1".to_owned(),
            message: json!({"id": "gh:C9", "body": "because", "author": "alice",
                "createdAt": "t0", "updatedAt": "t1"}),
        }]
    );
}

#[test]
fn a_github_edit_replaces_an_unchanged_local_body() {
    let plan = reconcile(
        &remote(vec![thread("T1", vec![comment("C1", "why not?")])]),
        &registry(&[("m1", known("C1", "why?", true))]),
        &snap(LOCAL_THREAD),
    );
    assert_eq!(
        plan.edits,
        vec![DifitEdit::SetBody {
            message_id: "m1".to_owned(),
            body: "why not?".to_owned(),
            updated_at: "t1".to_owned(),
        }]
    );
    assert_eq!(plan.upserts[0].1.body.as_deref(), Some("why not?"));
}

#[test]
fn an_unsent_local_edit_wins_over_a_github_edit() {
    let plan = reconcile(
        &remote(vec![thread("T1", vec![comment("C1", "remote words")])]),
        &registry(&[("m1", known("C1", "the old words", true))]),
        &snap(LOCAL_THREAD),
    );
    assert!(plan.edits.is_empty(), "{:?}", plan.edits);
}

#[test]
fn a_submitted_draft_becomes_published() {
    let draft = SyncedComment {
        status: SyncStatus::Draft,
        ..known("C1", "why?", true)
    };
    let plan = reconcile(
        &remote(vec![thread("T1", vec![comment("C1", "why?")])]),
        &registry(&[("m1", draft)]),
        &snap(LOCAL_THREAD),
    );
    assert_eq!(plan.upserts[0].1.status, SyncStatus::Published);
    assert!(plan.edits.is_empty());
}

#[test]
fn a_thread_deleted_on_github_is_removed_with_its_local_replies() {
    let plan = reconcile(
        &remote(Vec::new()),
        &registry(&[("m1", known("C1", "why?", true))]),
        &snap(LOCAL_THREAD),
    );
    assert_eq!(
        plan.edits,
        vec![DifitEdit::Remove {
            message_id: "m1".to_owned()
        }]
    );
    assert_eq!(plan.forgets, vec!["m1"]);
    assert_eq!(plan.removed, vec!["m1", "m2"]);
}

#[test]
fn an_unlisted_draft_survives_while_the_pending_review_exists() {
    let draft = SyncedComment {
        status: SyncStatus::Draft,
        ..known("C1", "why?", true)
    };
    let mut state = remote(Vec::new());
    state.has_pending_review = true;
    let reg = registry(&[("m1", draft)]);
    assert_eq!(
        reconcile(&state, &reg, &snap(LOCAL_THREAD)),
        PullPlan::default()
    );

    state.has_pending_review = false;
    assert_eq!(
        reconcile(&state, &reg, &snap(LOCAL_THREAD)).forgets,
        vec!["m1"],
        "a discarded review takes its drafts with it"
    );
}

#[test]
fn a_resolved_thread_is_removed_locally() {
    let mut resolved = thread("T1", vec![comment("C1", "why?")]);
    resolved.resolved = true;
    let plan = reconcile(
        &remote(vec![resolved]),
        &registry(&[("m1", known("C1", "why?", true))]),
        &snap(LOCAL_THREAD),
    );
    assert_eq!(plan.forgets, vec!["m1"]);
    assert!(matches!(&plan.edits[0], DifitEdit::Remove { message_id } if message_id == "m1"));
}

#[test]
fn a_partially_fetched_thread_never_removes_anything() {
    let mut partial = thread("T1", Vec::new());
    partial.complete = false;
    let plan = reconcile(
        &remote(vec![partial]),
        &registry(&[("m1", known("C1", "why?", true))]),
        &snap(LOCAL_THREAD),
    );
    assert!(plan.edits.is_empty() && plan.forgets.is_empty());
}

#[test]
fn unposted_comments_are_not_mistaken_for_deletions() {
    let plan = reconcile(
        &remote(Vec::new()),
        &registry(&[("m1", SyncedComment::pending())]),
        &snap(LOCAL_THREAD),
    );
    assert_eq!(plan, PullPlan::default());
}

#[test]
fn github_wins_on_the_first_pull_then_only_changes_flow() {
    let files = vec![
        ("a.rs".to_owned(), ViewedState::Viewed),
        ("b.rs".to_owned(), ViewedState::Dismissed),
    ];
    assert_eq!(
        viewed_changes(&files, &BTreeMap::new(), false),
        vec![("a.rs".to_owned(), true), ("b.rs".to_owned(), false)]
    );

    let before: BTreeMap<_, _> = [
        ("a.rs".to_owned(), ViewedState::Viewed),
        ("b.rs".to_owned(), ViewedState::Unviewed),
    ]
    .into_iter()
    .collect();
    assert!(
        viewed_changes(&files, &before, true).is_empty(),
        "unviewed and dismissed are both 'not viewed'"
    );

    let after = vec![("a.rs".to_owned(), ViewedState::Dismissed)];
    assert_eq!(
        viewed_changes(&after, &before, true),
        vec![("a.rs".to_owned(), false)]
    );
}
