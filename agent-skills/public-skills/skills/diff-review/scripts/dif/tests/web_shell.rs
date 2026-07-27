//! Integration test for the web-shell server: routing, embedded assets, the
//! groups fail-open, and the proxy error path — all without a running difit.

use std::net::TcpListener;
use std::time::Duration;

use dif::web::WebShell;

fn free_port() -> u16 {
    TcpListener::bind("127.0.0.1:0")
        .unwrap()
        .local_addr()
        .unwrap()
        .port()
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
    )
    .expect("shell binds");
    std::thread::sleep(Duration::from_millis(50));
    let base = format!("http://127.0.0.1:{shell_port}");

    // Shell page.
    let html = ureq::get(&format!("{base}/"))
        .call()
        .unwrap()
        .into_string()
        .unwrap();
    assert!(
        html.contains("id=\"brandTitle\""),
        "serves the shell document"
    );

    // meta.json carries the branch + worktree pill decision.
    let meta: serde_json::Value = ureq::get(&format!("{base}/__wrap/meta.json"))
        .call()
        .unwrap()
        .into_json()
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
    assert_eq!(css.content_type(), "text/css");
    let css_text = css.into_string().unwrap();
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
            .header("Cache-Control")
            .is_some_and(|c| c.contains("no-store")),
        "shell.js must be served no-store"
    );
    let js = js_resp.into_string().unwrap();
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
        .into_string()
        .unwrap();
    assert!(
        inject.contains("difit-viewed-index-v1/"),
        "serves inject.js"
    );

    // groups.json fail-open: missing guide → empty roster.
    let groups = ureq::get(&format!("{base}/__wrap/groups.json"))
        .call()
        .unwrap()
        .into_string()
        .unwrap();
    assert_eq!(groups, "[]");
    let summary = ureq::get(&format!("{base}/__wrap/diff-summary.md"))
        .call()
        .unwrap()
        .into_string()
        .unwrap();
    assert_eq!(summary, "", "missing summary fails soft");
    let test_plan = ureq::get(&format!("{base}/__wrap/test-plan.md"))
        .call()
        .unwrap()
        .into_string()
        .unwrap();
    assert_eq!(test_plan, "", "missing test plan fails soft");

    // Regenerate bridge: POST flags the request; the TUI's poll takes it once.
    assert!(
        !shell.take_regen_request(),
        "no request pending before the POST"
    );
    let regen = ureq::post(&format!("{base}/__wrap/regenerate"))
        .send_bytes(b"")
        .unwrap();
    assert_eq!(regen.status(), 202, "regenerate is accepted");
    assert!(shell.take_regen_request(), "the POST set the flag");
    assert!(
        !shell.take_regen_request(),
        "the flag is cleared after one take"
    );

    // Unknown shell asset → 404.
    match ureq::get(&format!("{base}/__wrap/nope.css")).call() {
        Err(ureq::Error::Status(404, _)) => {}
        other => panic!("expected 404 for unknown asset, got {other:?}"),
    }

    // Proxied routes with difit down → 502 (never hang).
    for path in ["/api/diff", "/__wrap/difit", "/assets/x.js"] {
        match ureq::get(&format!("{base}{path}")).call() {
            Err(ureq::Error::Status(502, _)) => {}
            other => panic!("expected 502 for {path} with difit down, got {other:?}"),
        }
    }

    shell.shutdown();
}
