//! End-to-end checks of the difit ↔ poller ↔ transcript path, both directions.
//!
//! Each test spawns a *real* difit against a throwaway git repo. One drives the
//! mirror direction (a comment POSTed to difit reaches the transcript file); the
//! other drives the inbound direction (a transcript the `diff-review` skill
//! wrote reaches the live server). Both skip — they do not fail — when `git` or
//! `difit` are absent, so they stay robust on machines without difit installed.

use std::path::Path;
use std::process::Command;
use std::thread;
use std::time::{Duration, Instant};

use dif::comparison::ComparisonKey;
use dif::difit::poller::Poller;
use dif::difit::server;

fn have(bin: &str, arg: &str) -> bool {
    Command::new(bin)
        .arg(arg)
        .output()
        .is_ok_and(|o| o.status.success())
}

fn git(repo: &Path, args: &[&str]) {
    let status = Command::new("git")
        .args(args)
        .current_dir(repo)
        .status()
        .expect("run git");
    assert!(status.success(), "git {args:?} failed");
}

/// A repo with one committed file and one uncommitted change, so `.` shows it.
fn repo_with_a_change(repo: &Path) {
    git(repo, &["init", "-q"]);
    git(repo, &["config", "user.email", "t@t.test"]);
    git(repo, &["config", "user.name", "Test"]);
    std::fs::write(repo.join("file.txt"), "line one\n").unwrap();
    git(repo, &["add", "."]);
    git(repo, &["commit", "-q", "-m", "init"]);
    std::fs::write(repo.join("file.txt"), "line one\nline two\n").unwrap();
}

/// Poll `check` until it returns true, or give up after `secs`.
fn wait_for(secs: u64, mut check: impl FnMut() -> bool) -> bool {
    let deadline = Instant::now() + Duration::from_secs(secs);
    while Instant::now() < deadline {
        if check() {
            return true;
        }
        thread::sleep(Duration::from_millis(150));
    }
    false
}

#[test]
fn reviewer_comment_posted_to_difit_lands_in_transcript() {
    if !have("git", "--version") || !have("difit", "--version") {
        eprintln!("SKIP: git or difit not available");
        return;
    }

    let tmp = tempfile::tempdir().expect("tempdir");
    let repo = tmp.path();
    repo_with_a_change(repo);

    let port = server::pick_port(4900);
    let _difit = server::spawn(
        repo,
        &ComparisonKey::Uncommitted,
        port,
        "127.0.0.1",
        None,
        false, // suppress the browser in tests
        24,
        80,
    )
    .expect("spawn difit");

    assert!(
        server::wait_until_ready(port, 75),
        "difit never became ready on port {port}"
    );

    // Simulate the reviewer (or claude) posting an import-shape comment.
    let body = serde_json::json!([{
        "type": "thread",
        "id": "jp-int-1",
        "filePath": "file.txt",
        "position": {"side": "new", "line": 2},
        "body": "integration comment",
        "author": "reviewer",
        "createdAt": "2026-01-01T00:00:00Z",
        "updatedAt": "2026-01-01T00:00:00Z"
    }]);
    let resp = ureq::post(&format!("http://localhost:{port}/api/comment-imports"))
        .send_json(body)
        .expect("POST comment-imports");
    assert_eq!(resp.status(), 200);

    // The poller should mirror the new comment into the transcript file.
    let transcript = repo.join(".difit").join("rt-difit-dot.json");
    let _poller = Poller::start(port, transcript.clone(), Duration::from_millis(300));

    let mirrored = wait_for(10, || {
        std::fs::read_to_string(&transcript).is_ok_and(|t| t.contains("integration comment"))
    });

    let seen = std::fs::read_to_string(&transcript).unwrap_or_default();
    assert!(
        mirrored && seen.contains("reviewer"),
        "transcript never received the posted comment; saw: {seen:?}"
    );
}

/// The instant-launch path: difit starts on an empty transcript, then the
/// `diff-review` skill writes its round straight into that file while difit is
/// already serving. The poller must push the new threads into the live server
/// (so the open browser shows them) instead of overwriting them on its next
/// mirror — and the reviewer's own live comment must survive that write.
#[test]
fn a_transcript_the_skill_wrote_reaches_the_live_server() {
    if !have("git", "--version") || !have("difit", "--version") {
        eprintln!("SKIP: git or difit not available");
        return;
    }

    let tmp = tempfile::tempdir().expect("tempdir");
    let repo = tmp.path();
    repo_with_a_change(repo);

    // Launch with no prepared review: an empty transcript, no `--comment`.
    let transcript = repo.join(".difit").join("rt-difit-dot.json");
    dif::difit::transcript::ensure_exists(&transcript).expect("create empty transcript");

    let port = server::pick_port(4930);
    let _difit = server::spawn(
        repo,
        &ComparisonKey::Uncommitted,
        port,
        "127.0.0.1",
        None,
        false,
        24,
        80,
    )
    .expect("spawn difit");
    assert!(
        server::wait_until_ready(port, 75),
        "difit never became ready on port {port}"
    );

    let comments_url = format!("http://localhost:{port}/api/comments-json");
    let live = || {
        ureq::get(&comments_url)
            .call()
            .ok()
            .and_then(|r| r.into_string().ok())
            .unwrap_or_default()
    };

    // The reviewer comments while the LLM is still preparing the review.
    ureq::post(&format!("http://localhost:{port}/api/comment-imports"))
        .send_json(serde_json::json!([{
            "type": "thread", "id": "reviewer-1", "filePath": "file.txt",
            "position": {"side": "new", "line": 2}, "body": "why line two?",
            "author": "reviewer"
        }]))
        .expect("POST the reviewer's comment");

    let _poller = Poller::start(port, transcript.clone(), Duration::from_millis(300));
    assert!(
        wait_for(10, || std::fs::read_to_string(&transcript)
            .is_ok_and(|t| t.contains("why line two?"))),
        "the reviewer's comment was never mirrored to the transcript"
    );

    // The skill finishes its round: it preserves the mirrored conversation and
    // appends its own explainer thread, writing the whole file.
    std::fs::write(
        &transcript,
        serde_json::to_string_pretty(&serde_json::json!([
            {"type": "thread", "id": "reviewer-1", "filePath": "file.txt",
             "position": {"side": "new", "line": 2}, "body": "why line two?",
             "author": "reviewer"},
            {"type": "thread", "id": "claude-r1-file-2", "filePath": "file.txt",
             "position": {"side": "new", "line": 2}, "body": "Round one explainer.",
             "author": "claude", "createdAt": "2026-08-07T10:00:00Z",
             "updatedAt": "2026-08-07T10:00:00Z"}
        ]))
        .unwrap(),
    )
    .expect("skill writes the transcript");

    assert!(
        wait_for(10, || live().contains("Round one explainer.")),
        "the skill's thread never reached the live difit server"
    );

    // …and the merged conversation is mirrored back, reviewer comment intact.
    assert!(
        wait_for(10, || {
            std::fs::read_to_string(&transcript).is_ok_and(|t| {
                t.contains("Round one explainer.") && t.contains("why line two?")
            })
        }),
        "the transcript did not settle on the merged conversation"
    );
}
