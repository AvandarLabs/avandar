//! Live end-to-end smoke against a real difit: proves the proxy injects our
//! script into difit's document and filters `/api/diff` by the group in the
//! `Referer`. `#[ignore]` because it spawns difit (node) and binds ports — run
//! it on demand with `cargo test --test web_shell_live -- --ignored`.

use std::net::TcpListener;
use std::path::PathBuf;
use std::process::{Child, Command};
use std::time::{Duration, Instant};

use dif::web::WebShell;

fn free_port() -> u16 {
    TcpListener::bind("127.0.0.1:0")
        .unwrap()
        .local_addr()
        .unwrap()
        .port()
}

/// Kills the difit child on drop so a panicking assertion can't leak a
/// `--keep-alive` server.
struct Difit(Child);
impl Drop for Difit {
    fn drop(&mut self) {
        let _ = self.0.kill();
        let _ = self.0.wait();
    }
}

fn git(dir: &std::path::Path, args: &[&str]) {
    let ok = Command::new("git")
        .args(args)
        .current_dir(dir)
        .status()
        .unwrap()
        .success();
    assert!(ok, "git {args:?} failed");
}

#[test]
#[ignore = "spawns difit + binds ports; run with --ignored"]
#[allow(clippy::too_many_lines)]
fn injects_and_filters_against_real_difit() {
    let repo = tempfile::tempdir().unwrap();
    let root = repo.path();
    git(root, &["init", "-q"]);
    git(root, &["config", "user.email", "t@t.co"]);
    git(root, &["config", "user.name", "t"]);
    std::fs::write(root.join("a.ts"), "export const a = 1;\n").unwrap();
    std::fs::write(root.join("b.ts"), "export const b = 2;\n").unwrap();
    git(root, &["add", "-A"]);
    git(root, &["commit", "-qm", "init"]);
    // Working-tree changes to review.
    std::fs::write(
        root.join("a.ts"),
        "export const a = 11;\nexport const added = true;\n",
    )
    .unwrap();
    std::fs::write(root.join("b.ts"), "export const b = 22;\n").unwrap();

    let difit_port = free_port();
    let child = Command::new("difit")
        .args([
            ".",
            "--port",
            &difit_port.to_string(),
            "--no-open",
            "--keep-alive",
            "--include-untracked",
        ])
        .current_dir(root)
        .spawn()
        .expect("difit must be on PATH for this test");
    let _difit = Difit(child);

    // Wait for difit to answer.
    let deadline = Instant::now() + Duration::from_secs(10);
    loop {
        if ureq::get(&format!("http://localhost:{difit_port}/api/diff"))
            .call()
            .is_ok()
        {
            break;
        }
        assert!(Instant::now() < deadline, "difit never became ready");
        std::thread::sleep(Duration::from_millis(150));
    }

    // A guide.json putting only a.ts in group 1.
    let guide: PathBuf = root.join("guide.json");
    std::fs::write(
        &guide,
        r#"[{ "n": 1, "kind": "bug", "name": "g1", "files": [ { "path": "a.ts" } ] }]"#,
    )
    .unwrap();

    let shell_port = free_port();
    let mut shell = WebShell::start(
        difit_port,
        shell_port,
        guide,
        "feat/web-shell".into(),
        "web-shell".into(),
        root.join("summary.md"),
        root.join("test-plan.md"),
    )
    .unwrap();
    std::thread::sleep(Duration::from_millis(50));
    let base = format!("http://127.0.0.1:{shell_port}");

    // 1) difit document is proxied AND our script is injected.
    let doc = ureq::get(&format!("{base}/__wrap/difit"))
        .call()
        .unwrap()
        .into_string()
        .unwrap();
    assert!(
        doc.contains(r#"<script src="/__wrap/inject.js"></script>"#),
        "script injected"
    );
    assert!(
        doc.contains("id=\"root\"") || doc.to_lowercase().contains("<div id=root"),
        "difit markup present"
    );

    // 2) Unfiltered /api/diff has both files.
    let full: serde_json::Value = ureq::get(&format!("{base}/api/diff"))
        .call()
        .unwrap()
        .into_json()
        .unwrap();
    let full_paths: Vec<&str> = full["files"]
        .as_array()
        .unwrap()
        .iter()
        .map(|f| f["path"].as_str().unwrap())
        .collect();
    assert!(
        full_paths.contains(&"a.ts") && full_paths.contains(&"b.ts"),
        "full diff has both: {full_paths:?}"
    );

    // 3) With a group-1 Referer, /api/diff is filtered to just a.ts, and the
    //    identity-bearing fields are unchanged (so the shared viewed key holds).
    let filtered: serde_json::Value = ureq::get(&format!("{base}/api/diff"))
        .set("Referer", &format!("{base}/__wrap/difit?group=1"))
        .call()
        .unwrap()
        .into_json()
        .unwrap();
    let filtered_paths: Vec<&str> = filtered["files"]
        .as_array()
        .unwrap()
        .iter()
        .map(|f| f["path"].as_str().unwrap())
        .collect();
    assert_eq!(
        filtered_paths,
        vec!["a.ts"],
        "group 1 filtered to a.ts only"
    );
    for key in ["baseCommitish", "targetCommitish", "commit"] {
        assert_eq!(
            filtered[key], full[key],
            "field {key} must survive filtering"
        );
    }

    // 4) SSE endpoint STREAMS (not buffered): headers must arrive promptly with
    //    the event-stream content type. difit's /api/watch never ends, so if the
    //    shell buffered it, this call would block until the client timeout.
    let sse = ureq::builder().timeout(Duration::from_secs(3)).build();
    let watch = sse
        .get(&format!("{base}/api/watch"))
        .call()
        .expect("SSE headers should stream through promptly (not buffer)");
    assert_eq!(
        watch.content_type(),
        "text/event-stream",
        "watch is streamed as SSE"
    );
    drop(watch); // never read the infinite body

    // 5) Comment round-trip through the shell: POST an import, then read it back
    //    from /api/comments-json — both proxied. This is the skill→difit→browser
    //    path the shell must carry.
    let import = r#"[{"type":"thread","id":"live-test-c1","filePath":"a.ts","position":{"side":"new","line":1},"body":"live-test-marker","author":"claude","createdAt":"2026-07-25T00:00:00Z","updatedAt":"2026-07-25T00:00:00Z"}]"#;
    ureq::post(&format!("{base}/api/comment-imports"))
        .set("Content-Type", "application/json")
        .send_string(import)
        .expect("comment-import POST proxied to difit");
    let comments = ureq::get(&format!("{base}/api/comments-json"))
        .call()
        .unwrap()
        .into_string()
        .unwrap();
    assert!(
        comments.contains("live-test-marker") || comments.contains("live-test-c1"),
        "posted comment is visible through the shell: {comments}"
    );

    shell.shutdown();
}
