//! Integration test for the web-shell server: routing, embedded assets, the
//! groups fail-open, and the proxy error path — all without a running difit.

use std::net::TcpListener;
use std::sync::Arc;
use std::time::Duration;

use dif::github::registry::SharedRegistry;
use dif::inject::mode::DispatchControl;
use dif::web::{CommentChannels, WebShell};

/// A shell for `develop` with no guide, summary, or test plan on disk.
fn start_develop_shell(difit_port: u16, shell_port: u16, channels: CommentChannels) -> WebShell {
    WebShell::start(
        difit_port,
        shell_port,
        "/no/such/guide.json".into(),
        "develop".into(),
        "develop".into(),
        "/no/such/summary.md".into(),
        "/no/such/test-plan.md".into(),
        channels,
    )
    .expect("shell binds")
}

fn channels() -> CommentChannels {
    CommentChannels {
        dispatch: Arc::new(DispatchControl::new()),
        github: SharedRegistry::load("/no/such/dir/r-github.json".into()),
    }
}

/// The response's media type without parameters (`text/css; charset=utf-8` ->
/// `text/css`).
fn mime(resp: &ureq::http::Response<ureq::Body>) -> String {
    resp.headers()
        .get("content-type")
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.split(';').next())
        .unwrap_or_default()
        .trim()
        .to_owned()
}

fn free_port() -> u16 {
    TcpListener::bind("127.0.0.1:0")
        .unwrap()
        .local_addr()
        .unwrap()
        .port()
}

#[test]
fn meta_json_counts_difit_restarts_so_an_open_tab_reloads_itself() {
    let shell_port = free_port();
    let mut shell = start_develop_shell(free_port(), shell_port, channels());
    std::thread::sleep(Duration::from_millis(50));
    let restarts = || -> serde_json::Value {
        let meta: serde_json::Value =
            ureq::get(&format!("http://127.0.0.1:{shell_port}/__wrap/meta.json"))
                .call()
                .unwrap()
                .into_body()
                .read_json()
                .unwrap();
        meta["difitRestarts"].clone()
    };
    assert_eq!(restarts(), 0);
    shell.note_difit_restart();
    assert_eq!(restarts(), 1);
    shell.shutdown();
}

#[test]
fn serves_shell_assets_and_fails_soft_without_difit() {
    let shell_port = free_port();
    // Nothing is listening on this port, so proxied routes must 502, not hang.
    let difit_port = free_port();
    // A worktree named for a different branch: the pill should show.
    let mut shell = WebShell::start(
        difit_port,
        shell_port,
        "/no/such/guide.json".into(),
        "develop".into(),
        "avandar".into(),
        "/no/such/summary.md".into(),
        "/no/such/test-plan.md".into(),
        channels(),
    )
    .expect("shell binds");
    std::thread::sleep(Duration::from_millis(50));
    let base = format!("http://127.0.0.1:{shell_port}");

    // Shell page.
    let html = ureq::get(&format!("{base}/"))
        .call()
        .unwrap()
        .into_body()
        .read_to_string()
        .unwrap();
    assert!(
        html.contains("id=\"brandTitle\""),
        "serves the shell document"
    );
    assert_eq!(
        html.matches(" title=\"").count(),
        1,
        "only the iframe keeps a native title (its accessible name); every other hint uses the shell's styled tooltip"
    );

    // meta.json carries the branch + worktree pill decision.
    let meta: serde_json::Value = ureq::get(&format!("{base}/__wrap/meta.json"))
        .call()
        .unwrap()
        .into_body()
        .read_json()
        .unwrap();
    assert_eq!(meta["branch"], "develop", "branch titles the header");
    assert_eq!(meta["worktree"], "avandar");
    assert_eq!(
        meta["showWorktree"], true,
        "pill shows when worktree differs from branch"
    );

    // Embedded assets.
    let css = ureq::get(&format!("{base}/__wrap/shell.css"))
        .call()
        .unwrap();
    assert_eq!(mime(&css), "text/css");
    let css_text = css.into_body().read_to_string().unwrap();
    assert!(
        css_text.contains("font-size: 13.5px;"),
        "diff summary font size should be 1px larger"
    );
    assert!(
        css_text.contains(".diff-summary ul"),
        "diff summary bullets should have compact list styling"
    );
    assert!(
        css_text.contains(".grp-orient {\n  font-size: 13.5px;"),
        "group summary font size should be 1.5px larger"
    );
    assert!(
        css_text.contains(".nav-item.active:hover {\n  background:"),
        "active full diff nav item should show a distinct hover background"
    );
    assert!(
        css_text.contains(".grp-block.active .grp-head:hover {\n  background:"),
        "active group headings should still show a distinct hover background"
    );
    assert!(
        css_text
            .contains(".files {\n  max-height: 45vh;\n  overflow-y: auto;\n  overflow-x: hidden;"),
        "expanded group file lists should scroll independently"
    );
    assert!(
        css_text.contains(".tb-left {\n  display: flex;\n  align-items: center;\n  gap: 9px;\n  min-width: 0;\n  width: 100%;"),
        "the header's left column must fill only its grid track, so it never runs under the centered view title"
    );
    assert!(
        css_text.contains(
            ".gh-bar {\n  display: flex;\n  align-items: center;\n  gap: 6px;\n  flex: 1 1 auto;"
        ),
        "the GitHub bar takes the header's free space and keeps its buttons whole"
    );
    assert!(
        css_text.contains("  flex: 1 1 0;\n  width: 0;\n  max-width: 340px;"),
        "a long GitHub notice only fills leftover space and ellipsizes, never squeezing the branch title"
    );
    assert!(
        css_text.contains(".tip {\n  position: fixed;")
            && css_text.contains("  white-space: pre-line;"),
        "the shell tooltip keeps line breaks for multi-line tips"
    );
    assert!(
        css_text.contains(".grp-body {\n  display: grid;\n  grid-template-rows: 1fr;"),
        "the expanded accordion should size to its content, not a fixed max-height"
    );
    assert!(
        css_text.contains(".grp-body-inner {\n  overflow: hidden;\n  min-height: 0;"),
        "the accordion's inner wrapper should clip only while it collapses"
    );
    assert!(
        css_text.contains(".test-plan-panel {\n  padding: 8px 6px 16px;\n  color: var(--ink-2);\n  font-size: 13.5px;"),
        "test plan base font size should be 1px larger"
    );
    assert!(
        css_text.contains("font-size: 12.5px;"),
        "test plan code blocks should be 1px larger"
    );
    let js_resp = ureq::get(&format!("{base}/__wrap/shell.js"))
        .call()
        .unwrap();
    // Our own frontend must never be cached, else a browser keeps running a stale
    // copy after `dif` relaunches with a rebuilt frontend.
    assert!(
        js_resp
            .headers()
            .get("Cache-Control")
            .and_then(|c| c.to_str().ok())
            .is_some_and(|c| c.contains("no-store")),
        "shell.js must be served no-store"
    );
    let js = js_resp.into_body().read_to_string().unwrap();
    assert!(js.contains("selectView"), "serves shell.js");
    assert!(
        js.contains("renderSummaryMarkdown"),
        "summary markdown renderer supports bullets"
    );
    assert!(
        js.contains("<ul>"),
        "summary bullet renderer emits unordered lists"
    );
    assert!(
        js.contains("data-group-block"),
        "group block should carry a click target"
    );
    assert!(
        js.contains("closest(\"[data-group-block]\")"),
        "clicking inside a group block should select the group"
    );

    // inject.js.
    let inject = ureq::get(&format!("{base}/__wrap/inject.js"))
        .call()
        .unwrap()
        .into_body()
        .read_to_string()
        .unwrap();
    assert!(
        inject.contains("difit-viewed-index-v1/"),
        "serves inject.js"
    );

    // groups.json fail-open: missing guide → empty roster.
    let groups = ureq::get(&format!("{base}/__wrap/groups.json"))
        .call()
        .unwrap()
        .into_body()
        .read_to_string()
        .unwrap();
    assert_eq!(groups, "[]");
    let summary = ureq::get(&format!("{base}/__wrap/diff-summary.md"))
        .call()
        .unwrap()
        .into_body()
        .read_to_string()
        .unwrap();
    assert_eq!(summary, "", "missing summary fails soft");
    let test_plan = ureq::get(&format!("{base}/__wrap/test-plan.md"))
        .call()
        .unwrap()
        .into_body()
        .read_to_string()
        .unwrap();
    assert_eq!(test_plan, "", "missing test plan fails soft");

    // Regenerate bridge: POST flags the request; the TUI's poll takes it once.
    assert!(
        !shell.take_regen_request(),
        "no request pending before the POST"
    );
    let regen = ureq::post(&format!("{base}/__wrap/regenerate"))
        .send(b"")
        .unwrap();
    assert_eq!(regen.status(), 202, "regenerate is accepted");
    assert!(shell.take_regen_request(), "the POST set the flag");
    assert!(
        !shell.take_regen_request(),
        "the flag is cleared after one take"
    );

    // Unknown shell asset → 404.
    match ureq::get(&format!("{base}/__wrap/nope.css")).call() {
        Err(ureq::Error::StatusCode(404)) => {}
        other => panic!("expected 404 for unknown asset, got {other:?}"),
    }

    // Proxied routes with difit down → 502 (never hang).
    for path in ["/api/diff", "/__wrap/difit", "/assets/x.js"] {
        match ureq::get(&format!("{base}{path}")).call() {
            Err(ureq::Error::StatusCode(502)) => {}
            other => panic!("expected 502 for {path} with difit down, got {other:?}"),
        }
    }

    shell.shutdown();
}

#[test]
fn delivery_mode_round_trips_and_send_all_reaches_the_tui() {
    let shell_port = free_port();
    let channels = channels();
    let mut shell = start_develop_shell(free_port(), shell_port, channels.clone());
    std::thread::sleep(Duration::from_millis(50));
    let base = format!("http://127.0.0.1:{shell_port}");

    let state: serde_json::Value = ureq::get(&format!("{base}/__wrap/dispatch.json"))
        .call()
        .unwrap()
        .into_body()
        .read_json()
        .unwrap();
    assert_eq!(state["mode"], "bulk", "bulk delivery is the default");

    let state: serde_json::Value = ureq::post(&format!("{base}/__wrap/dispatch"))
        .send(r#"{"mode":"eager"}"#)
        .unwrap()
        .into_body()
        .read_json()
        .unwrap();
    assert_eq!(state["mode"], "eager");
    assert!(!channels.dispatch.is_bulk());

    let sent = ureq::post(&format!("{base}/__wrap/send-all"))
        .send_empty()
        .unwrap();
    assert_eq!(sent.status(), 202);
    assert!(channels.dispatch.take_send_all());

    let github: serde_json::Value = ureq::get(&format!("{base}/__wrap/github.json"))
        .call()
        .unwrap()
        .into_body()
        .read_json()
        .unwrap();
    assert_eq!(github["available"], false, "no PR looked up yet");
    shell.shutdown();
}

/// A stand-in difit that holds one comment and accepts saves, recording the
/// body of each `POST /api/comments` it receives.
fn fake_difit(port: u16) -> std::sync::mpsc::Receiver<String> {
    let server = tiny_http::Server::http(("127.0.0.1", port)).unwrap();
    let (saved, received) = std::sync::mpsc::channel();
    std::thread::spawn(move || {
        for mut request in server.incoming_requests() {
            let body = if request.url().starts_with("/api/comments-json") {
                r#"{"version":1,"threads":[{"id":"t1","messages":[{"id":"m1","body":"held"}]}]}"#
                    .to_owned()
            } else {
                let mut posted = String::new();
                request.as_reader().read_to_string(&mut posted).unwrap();
                let _ = saved.send(posted);
                r#"{"success":true,"version":2}"#.to_owned()
            };
            let _ = request.respond(tiny_http::Response::from_string(body));
        }
    });
    received
}

#[test]
fn a_pr_bound_save_marks_only_the_new_comment_and_still_reaches_difit() {
    let difit_port = free_port();
    let saves = fake_difit(difit_port);
    let dir = tempfile::tempdir().unwrap();
    let channels = CommentChannels {
        dispatch: Arc::new(DispatchControl::new()),
        github: SharedRegistry::load(dir.path().join("r-github.json")),
    };
    let shell_port = free_port();
    let mut shell = start_develop_shell(difit_port, shell_port, channels.clone());
    std::thread::sleep(Duration::from_millis(50));
    let url = format!("http://127.0.0.1:{shell_port}/api/comments");
    let body = r#"{"threads":[{"id":"t1","messages":[{"id":"m1","body":"held"},{"id":"m2","body":"to the PR"}]}],"baseVersion":1}"#;

    // An untagged save (a TUI-bound comment) marks nothing.
    ureq::post(&url).send(body).unwrap();
    assert!(channels.github.github_ids().is_empty());

    ureq::post(&url)
        .header("X-Dif-Destination", "github")
        .send(body)
        .unwrap();
    let ids = channels.github.github_ids();
    assert_eq!(ids.len(), 1);
    assert!(ids.contains("m2"), "{ids:?}");
    assert_eq!(saves.recv_timeout(Duration::from_secs(1)).unwrap(), body);
    assert_eq!(saves.recv_timeout(Duration::from_secs(1)).unwrap(), body);
    assert!(
        channels.dispatch.take_send_now().is_empty(),
        "only a send-now save skips the bulk queue"
    );

    // A send-now save hands only the new comment to the LLM at once.
    ureq::post(&url)
        .header("X-Dif-Send", "now")
        .send(body)
        .unwrap();
    assert_eq!(channels.dispatch.take_send_now(), vec!["m2"]);
    assert_eq!(saves.recv_timeout(Duration::from_secs(1)).unwrap(), body);
    shell.shutdown();
}
