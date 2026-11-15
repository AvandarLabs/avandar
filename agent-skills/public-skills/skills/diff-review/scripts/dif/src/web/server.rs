//! The `tiny_http` request loop: route each request and reply.
//!
//! One thread per request so a long-lived SSE stream (`/api/watch`) never
//! blocks other requests. Pure decisions (routing, filtering, injection) live
//! in the sibling modules; this file is the glue that reads the request, calls
//! them, and writes difit's (possibly transformed) response back.

use std::io::{Read, Write};
use std::path::PathBuf;
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, AtomicU64};

use tiny_http::{Header, Request, Response, Server, StatusCode};

use super::router::{self, DiffFilter, Route};
use super::{filter, github_routes, groups, inject, proxy, review_routes, shell_routes};
use crate::github::registry::SharedRegistry;
use crate::inject::mode::DispatchControl;

/// Per-request context shared across handler threads.
pub struct Ctx {
    /// The difit server we proxy to.
    pub difit_port: u16,
    /// The `…-guide.json` this review's group filter + sidebar read from.
    pub guide_json_path: PathBuf,
    /// The `…-summary.md` high-level summary served to the sidebar.
    pub diff_summary_path: PathBuf,
    /// The `…-test-plan.md` manual test plan served to the sidebar.
    pub test_plan_path: PathBuf,
    /// The branch under review — the header title (served at `/__wrap/meta.json`).
    pub branch: String,
    /// The worktree's directory name — the header pill when it differs from the branch.
    pub worktree: String,
    /// Set to `true` when the browser POSTs `/__wrap/regenerate`; the TUI event
    /// loop swaps it back to `false` and triggers a diff-guide regeneration.
    pub regen: Arc<AtomicBool>,
    /// How many times the TUI restarted difit, served in `meta.json` so an open
    /// shell tab reloads itself instead of the restart opening another.
    pub difit_restarts: Arc<AtomicU64>,
    /// Cache-busting tag appended to `shell.js` / `shell.css` in the served page,
    /// so a browser never runs a stale frontend after a rebuild.
    pub asset_version: String,
    /// Bulk vs eager comment delivery, shared with the TUI event loop.
    pub dispatch: Arc<DispatchControl>,
    /// Which comments are bound for the GitHub PR, shared with the poller.
    pub github: SharedRegistry,
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

/// Respond with `body` as `content_type` at `status`; the browser may cache it.
pub(super) fn send_bytes(
    request: Request,
    status: u16,
    content_type: &str,
    body: Vec<u8>,
) -> std::io::Result<()> {
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
pub(super) fn send_bytes_nostore(
    request: Request,
    status: u16,
    content_type: &str,
    body: Vec<u8>,
) -> std::io::Result<()> {
    let mut resp = Response::from_data(body).with_status_code(StatusCode(status));
    if let Some(h) = header("Content-Type", content_type) {
        resp = resp.with_header(h);
    }
    if let Some(h) = header("Cache-Control", "no-store, must-revalidate") {
        resp = resp.with_header(h);
    }
    request.respond(resp)
}

/// Respond with an empty body at `status`.
pub(super) fn send_status(request: Request, status: u16) -> std::io::Result<()> {
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

/// `path` with `?query` appended when `query` is non-empty.
pub(super) fn with_query(path: &str, query: &str) -> String {
    if query.is_empty() {
        path.to_owned()
    } else {
        format!("{path}?{query}")
    }
}

/// The request's `Content-Type`, defaulting to `application/json`.
pub(super) fn request_content_type(request: &Request) -> String {
    request
        .headers()
        .iter()
        .find(|h| h.field.equiv("Content-Type"))
        .map_or_else(
            || "application/json".to_owned(),
            |h| h.value.as_str().to_owned(),
        )
}

fn handle(request: Request, ctx: &Ctx) -> std::io::Result<()> {
    let method = request.method().to_string();
    let url = request.url().to_owned();
    let (path, query) = url.split_once('?').unwrap_or((url.as_str(), ""));
    let referer = request
        .headers()
        .iter()
        .find(|h| h.field.equiv("Referer"))
        .map(|h| h.value.as_str().to_owned());

    match router::route(&method, path, query, referer.as_deref()) {
        route @ (Route::ShellPage
        | Route::InjectJs
        | Route::ShellAsset(_)
        | Route::Groups
        | Route::DiffSummary
        | Route::TestPlan
        | Route::Meta
        | Route::Regenerate) => shell_routes::handle(route, request, ctx),
        route @ (Route::DispatchState
        | Route::SetDispatchMode
        | Route::SendAll
        | Route::SaveComments) => review_routes::handle(&route, request, ctx, query),
        route @ (Route::GithubState
        | Route::GithubPull
        | Route::GithubSubmit
        | Route::GithubViewed
        | Route::GithubConflicts
        | Route::GithubConnection) => github_routes::handle(&route, request, ctx),
        Route::DifitDoc => match proxy::get(ctx.difit_port, "/") {
            Ok(up) => send_bytes_nostore(
                request,
                up.status,
                "text/html; charset=utf-8",
                inject::inject_script(&up.body),
            ),
            Err(_) => send_status(request, 502),
        },
        Route::ApiDiff {
            filter,
            commented_only,
        } => serve_api_diff(request, ctx, query, &filter, commented_only),
        Route::Proxy => proxy_to_difit(request, ctx, &method, path, query),
    }
}

/// Proxy difit's `/api/diff`, narrowed to the files `filter` selects and, when
/// `commented_only`, to the files with comments.
fn serve_api_diff(
    request: Request,
    ctx: &Ctx,
    query: &str,
    filter: &DiffFilter,
    commented_only: bool,
) -> std::io::Result<()> {
    let Ok(upstream) = proxy::get(ctx.difit_port, &with_query("/api/diff", query)) else {
        return send_status(request, 502);
    };
    let proxy::Upstream {
        status,
        content_type,
        body,
    } = upstream;
    let body = match filter {
        DiffFilter::None => body,
        DiffFilter::Group(n) => {
            let allowed = groups::Groups::load(&ctx.guide_json_path).allowed(*n);
            filter::filter_diff(&body, &allowed)
        }
        DiffFilter::Ungrouped => {
            let guide = groups::Groups::load(&ctx.guide_json_path).all_files();
            filter::filter_ungrouped(&body, &guide)
        }
    };
    let body = if commented_only {
        narrow_to_commented(ctx, body)
    } else {
        body
    };
    send_bytes_nostore(request, status, &content_type, body)
}

/// Keep only the files difit holds comments on. Fails open: if the comments
/// can't be read, the diff passes through unnarrowed.
fn narrow_to_commented(ctx: &Ctx, body: Vec<u8>) -> Vec<u8> {
    let commented = proxy::get(ctx.difit_port, "/api/comments-json")
        .ok()
        .and_then(|up| filter::commented_files(&up.body));
    match commented {
        Some(files) => filter::filter_diff(&body, &files),
        None => body,
    }
}

/// Relay any other request to difit unchanged, streaming its SSE endpoints.
fn proxy_to_difit(
    mut request: Request,
    ctx: &Ctx,
    method: &str,
    path: &str,
    query: &str,
) -> std::io::Result<()> {
    let pq = with_query(path, query);
    if is_sse(path) {
        return match proxy::open_stream(ctx.difit_port, &pq) {
            Ok((ct, reader)) => send_stream(request, &ct, reader),
            Err(_) => send_status(request, 502),
        };
    }
    let upstream = if method == "POST" {
        let ct = request_content_type(&request);
        let mut body = Vec::new();
        request.as_reader().read_to_end(&mut body)?;
        proxy::post(ctx.difit_port, &pq, &ct, &body)
    } else {
        proxy::get(ctx.difit_port, &pq)
    };
    match upstream {
        Ok(up) => send_bytes(request, up.status, &up.content_type, up.body),
        Err(_) => send_status(request, 502),
    }
}
