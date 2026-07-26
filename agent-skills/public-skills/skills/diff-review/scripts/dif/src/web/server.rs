//! The `tiny_http` request loop: route each request and reply.
//!
//! One thread per request so a long-lived SSE stream (`/api/watch`) never
//! blocks other requests. Pure decisions (routing, filtering, injection) live
//! in the sibling modules; this file is the glue that reads the request, calls
//! them, and writes difit's (possibly transformed) response back.

use std::io::{Read, Write};
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

use tiny_http::{Header, Request, Response, Server, StatusCode};

use super::router::{self, DiffFilter, Route};
use super::{filter, groups, inject, meta, proxy};

/// The embedded shell frontend + in-difit script (no build step; `include_str!`).
pub const SHELL_HTML: &str = include_str!("frontend/shell.html");
pub const SHELL_CSS: &str = include_str!("frontend/shell.css");
pub const INJECT_JS: &str = include_str!("frontend/inject.js");

/// The shell script, assembled from the ordered fragments under `frontend/shell/`.
///
/// They share ONE IIFE + closure scope: `shell.js` opens it and declares shared
/// state, the feature files add behavior, and `boot.js` runs startup + closes
/// the IIFE — so the order here is load-bearing (`shell.js` first, `boot.js`
/// last; see `frontend/shell/shell.js`). The parts are concatenated at compile
/// time and served as one `/__wrap/shell.js`.
pub const SHELL_JS: &str = concat!(
    include_str!("frontend/shell/shell.js"), "\n",
    include_str!("frontend/shell/tooltip.js"), "\n",
    include_str!("frontend/shell/helpers.js"), "\n",
    include_str!("frontend/shell/iframe.js"), "\n",
    include_str!("frontend/shell/render.js"), "\n",
    include_str!("frontend/shell/data.js"), "\n",
    include_str!("frontend/shell/spotlight.js"), "\n",
    include_str!("frontend/shell/hotkeys.js"), "\n",
    include_str!("frontend/shell/chrome.js"), "\n",
    include_str!("frontend/shell/boot.js"),
);

/// Per-request context shared across handler threads.
pub struct Ctx {
    /// The difit server we proxy to.
    pub difit_port: u16,
    /// The `…-guide.json` this review's group filter + sidebar read from.
    pub guide_json_path: PathBuf,
    /// The branch under review — the header title (served at `/__wrap/meta.json`).
    pub branch: String,
    /// The worktree's directory name — the header pill when it differs from the branch.
    pub worktree: String,
    /// Set to `true` when the browser POSTs `/__wrap/regenerate`; the TUI event
    /// loop swaps it back to `false` and triggers a diff-guide regeneration.
    pub regen: Arc<AtomicBool>,
    /// Cache-busting tag appended to `shell.js` / `shell.css` in the served page,
    /// so a browser never runs a stale frontend after a rebuild.
    pub asset_version: String,
}

/// Accept loop. Runs until the [`Server`] is unblocked.
pub fn serve(server: &Server, ctx: &Arc<Ctx>) {
    for request in server.incoming_requests() {
        let ctx = Arc::clone(ctx);
        std::thread::spawn(move || {
            let _ = handle(request, &ctx);
        });
    }
}

fn header(name: &str, value: &str) -> Option<Header> {
    Header::from_bytes(name.as_bytes(), value.as_bytes()).ok()
}

fn send_bytes(request: Request, status: u16, content_type: &str, body: Vec<u8>) -> std::io::Result<()> {
    let mut resp = Response::from_data(body).with_status_code(StatusCode(status));
    if let Some(h) = header("Content-Type", content_type) {
        resp = resp.with_header(h);
    }
    request.respond(resp)
}

/// Like [`send_bytes`] but marks the response uncacheable. Used for everything
/// the shell owns (its HTML/JS/CSS, `inject.js`, `meta.json`, `groups.json`, the
/// injected difit doc, the filtered `/api/diff`) so a browser never runs a stale
/// copy after `dif` relaunches with a rebuilt frontend. difit's own hashed
/// static assets still go through plain [`send_bytes`] and stay cacheable.
fn send_bytes_nostore(request: Request, status: u16, content_type: &str, body: Vec<u8>) -> std::io::Result<()> {
    let mut resp = Response::from_data(body).with_status_code(StatusCode(status));
    if let Some(h) = header("Content-Type", content_type) {
        resp = resp.with_header(h);
    }
    if let Some(h) = header("Cache-Control", "no-store, must-revalidate") {
        resp = resp.with_header(h);
    }
    request.respond(resp)
}

fn send_status(request: Request, status: u16) -> std::io::Result<()> {
    request.respond(Response::empty(StatusCode(status)))
}

/// Relay an SSE stream by taking over the raw socket and flushing every read.
///
/// `tiny_http`'s `Response` buffers an unknown-length body and never flushes for
/// an endless stream, so difit's live events (`/api/watch`, `/api/heartbeat`)
/// would never reach the browser through a normal `respond`. We instead take the
/// connection's writer, send a minimal `Connection: close` SSE header, then copy
/// difit's already-dechunked bytes through with an explicit flush per read — a
/// write error means the browser left, which ends the loop and drops difit's
/// upstream connection.
fn send_stream(
    request: Request,
    content_type: &str,
    mut reader: Box<dyn Read + Send + Sync>,
) -> std::io::Result<()> {
    let mut writer = request.into_writer();
    let head = format!(
        "HTTP/1.1 200 OK\r\nContent-Type: {content_type}\r\nCache-Control: no-cache\r\nConnection: close\r\n\r\n"
    );
    writer.write_all(head.as_bytes())?;
    writer.flush()?;

    let mut buf = [0u8; 4096];
    loop {
        let n = match reader.read(&mut buf) {
            Ok(0) => break, // difit closed the stream
            Ok(n) => n,
            Err(ref e) if e.kind() == std::io::ErrorKind::Interrupted => continue,
            Err(_) => break, // upstream error
        };
        if writer.write_all(&buf[..n]).is_err() || writer.flush().is_err() {
            break; // browser disconnected
        }
    }
    Ok(())
}

/// difit's SSE endpoints — must stream, never buffer.
fn is_sse(path: &str) -> bool {
    path == "/api/watch" || path == "/api/heartbeat"
}

fn with_query(path: &str, query: &str) -> String {
    if query.is_empty() {
        path.to_owned()
    } else {
        format!("{path}?{query}")
    }
}

fn asset(name: &str) -> Option<(&'static str, &'static str)> {
    match name {
        "shell.css" => Some(("text/css; charset=utf-8", SHELL_CSS)),
        "shell.js" => Some(("application/javascript; charset=utf-8", SHELL_JS)),
        _ => None,
    }
}

fn request_content_type(request: &Request) -> String {
    request
        .headers()
        .iter()
        .find(|h| h.field.equiv("Content-Type"))
        .map_or_else(|| "application/json".to_owned(), |h| h.value.as_str().to_owned())
}

#[allow(clippy::too_many_lines)]
fn handle(mut request: Request, ctx: &Ctx) -> std::io::Result<()> {
    let method = request.method().to_string();
    let url = request.url().to_owned();
    let (path, query) = url.split_once('?').unwrap_or((url.as_str(), ""));
    let referer = request
        .headers()
        .iter()
        .find(|h| h.field.equiv("Referer"))
        .map(|h| h.value.as_str().to_owned());

    match router::route(&method, path, query, referer.as_deref()) {
        Route::ShellPage => {
            // Append the build tag to the asset URLs so the browser fetches the
            // current frontend after a relaunch (belt-and-suspenders with no-store).
            let html = SHELL_HTML
                .replace("/__wrap/shell.css", &format!("/__wrap/shell.css?v={}", ctx.asset_version))
                .replace("/__wrap/shell.js", &format!("/__wrap/shell.js?v={}", ctx.asset_version));
            send_bytes_nostore(request, 200, "text/html; charset=utf-8", html.into_bytes())
        }
        Route::InjectJs => send_bytes_nostore(
            request,
            200,
            "application/javascript; charset=utf-8",
            INJECT_JS.as_bytes().to_vec(),
        ),
        Route::ShellAsset(name) => match asset(&name) {
            Some((ct, body)) => send_bytes_nostore(request, 200, ct, body.as_bytes().to_vec()),
            None => send_status(request, 404),
        },
        Route::Groups => {
            send_bytes_nostore(request, 200, "application/json", groups::read_raw(&ctx.guide_json_path))
        }
        Route::Meta => send_bytes_nostore(
            request,
            200,
            "application/json",
            meta::meta_json(&ctx.branch, &ctx.worktree),
        ),
        Route::Regenerate => {
            // Signal the TUI event loop to regenerate the diff guide (it swaps
            // the flag back and types the request into the LLM pane).
            ctx.regen.store(true, Ordering::Relaxed);
            send_status(request, 202)
        }
        Route::DifitDoc => match proxy::get(ctx.difit_port, "/") {
            Ok(up) => send_bytes_nostore(
                request,
                up.status,
                "text/html; charset=utf-8",
                inject::inject_script(&up.body),
            ),
            Err(_) => send_status(request, 502),
        },
        Route::ApiDiff { filter } => match proxy::get(ctx.difit_port, &with_query("/api/diff", query)) {
            Ok(up) => {
                let proxy::Upstream { status, content_type, body } = up;
                let body = match filter {
                    DiffFilter::None => body,
                    DiffFilter::Group(n) => {
                        let allowed = groups::Groups::load(&ctx.guide_json_path).allowed(n);
                        filter::filter_diff(&body, &allowed)
                    }
                    DiffFilter::Ungrouped => {
                        let guide = groups::Groups::load(&ctx.guide_json_path).all_files();
                        filter::filter_ungrouped(&body, &guide)
                    }
                };
                send_bytes_nostore(request, status, &content_type, body)
            }
            Err(_) => send_status(request, 502),
        },
        Route::Proxy => {
            let pq = with_query(path, query);
            if is_sse(path) {
                match proxy::open_stream(ctx.difit_port, &pq) {
                    Ok((ct, reader)) => send_stream(request, &ct, reader),
                    Err(_) => send_status(request, 502),
                }
            } else if method == "POST" {
                let ct = request_content_type(&request);
                let mut body = Vec::new();
                request.as_reader().read_to_end(&mut body)?;
                match proxy::post(ctx.difit_port, &pq, &ct, &body) {
                    Ok(up) => send_bytes(request, up.status, &up.content_type, up.body),
                    Err(_) => send_status(request, 502),
                }
            } else {
                match proxy::get(ctx.difit_port, &pq) {
                    Ok(up) => send_bytes(request, up.status, &up.content_type, up.body),
                    Err(_) => send_status(request, 502),
                }
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::SHELL_JS;

    /// `SHELL_JS` is assembled by concatenating ordered fragments that together
    /// form ONE IIFE. The ordering is load-bearing — `shell.js` must open the
    /// IIFE first and `boot.js` must close it last — but no per-file syntax
    /// check catches a mis-ordered concat. Guard the assembled shape here.
    #[test]
    fn shell_js_is_one_well_formed_iife() {
        // shell.js opens the IIFE + strict mode exactly once (a second wrapper
        // would mean a fragment was duplicated or the entry file was reordered).
        assert!(
            SHELL_JS.contains("(function () {\n  \"use strict\";"),
            "shell.js (the entry fragment) must open the IIFE first"
        );
        assert_eq!(
            SHELL_JS.matches("\"use strict\";").count(),
            1,
            "exactly one strict-mode wrapper across the whole bundle"
        );
        // boot.js closes the IIFE and must be last.
        assert!(
            SHELL_JS.trim_end().ends_with("})();"),
            "boot.js (the closing fragment) must come last"
        );
        // Ordering: the IIFE open precedes a feature fragment, which precedes
        // boot — i.e. shell.js → features → boot.
        let open = SHELL_JS.find("(function () {").expect("IIFE open present");
        let feature = SHELL_JS.find("hover tooltip").expect("a feature fragment present");
        let boot = SHELL_JS.find("===== boot =====").expect("boot fragment present");
        assert!(open < feature && feature < boot, "entry → features → boot order");
        // A couple of key symbols from different fragments actually made it in.
        for sym in ["selectView", "renderSidebar", "buildActions", "showNewChanges"] {
            assert!(SHELL_JS.contains(sym), "assembled bundle is missing {sym}");
        }
        // The console diagnostic hook was removed and stays removed.
        assert!(!SHELL_JS.contains("__difShell"), "the __difShell hook must not return");
    }
}
