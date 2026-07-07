//! End-to-end check of the difit ↔ poller ↔ transcript path.
//!
//! Spawns a *real* difit against a throwaway git repo, simulates a reviewer
//! comment by POSTing to `/api/comment-imports` (the same endpoint claude uses
//! for replies), and asserts the background [`Poller`] mirrors it into the
//! transcript file. Skips (does not fail) when `git` or `difit` are absent so
//! it stays robust on machines without difit installed.

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

#[test]
fn reviewer_comment_posted_to_difit_lands_in_transcript() {
    if !have("git", "--version") || !have("difit", "--version") {
        eprintln!("SKIP: git or difit not available");
        return;
    }

    let tmp = tempfile::tempdir().expect("tempdir");
    let repo = tmp.path();

    // A repo with one committed file, then an uncommitted change so `.` shows it.
    git(repo, &["init", "-q"]);
    git(repo, &["config", "user.email", "t@t.test"]);
    git(repo, &["config", "user.name", "Test"]);
    std::fs::write(repo.join("file.txt"), "line one\n").unwrap();
    git(repo, &["add", "."]);
    git(repo, &["commit", "-q", "-m", "init"]);
    std::fs::write(repo.join("file.txt"), "line one\nline two\n").unwrap();

    let port = server::pick_port(4900);
    let _difit = server::spawn(
        repo,
        &ComparisonKey::Uncommitted,
        port,
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

    let deadline = Instant::now() + Duration::from_secs(10);
    let mut seen = String::new();
    while Instant::now() < deadline {
        if let Ok(text) = std::fs::read_to_string(&transcript) {
            if text.contains("integration comment") {
                seen = text;
                break;
            }
        }
        thread::sleep(Duration::from_millis(150));
    }

    assert!(
        seen.contains("integration comment") && seen.contains("reviewer"),
        "transcript never received the posted comment; saw: {seen:?}"
    );
}
