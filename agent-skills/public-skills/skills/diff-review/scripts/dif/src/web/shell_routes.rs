//! Shell routes that serve what the shell itself owns: its page, scripts and
//! stylesheet, the guide roster, the sidebar documents, the header identity,
//! and the guide-regeneration signal.

use std::path::Path;
use std::sync::atomic::Ordering;

use tiny_http::Request;

use super::assets::{INJECT_JS, SHELL_CSS, SHELL_HTML, SHELL_JS};
use super::router::Route;
use super::server::{Ctx, send_bytes_nostore, send_status};
use super::{groups, meta};

/// Serve one of the shell-owned routes.
pub fn handle(route: Route, request: Request, ctx: &Ctx) -> std::io::Result<()> {
    match route {
        Route::ShellPage => serve_shell_page(request, ctx),
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
        Route::Groups => send_bytes_nostore(
            request,
            200,
            "application/json",
            groups::read_raw(&ctx.guide_json_path),
        ),
        Route::DiffSummary => send_markdown_file(request, &ctx.diff_summary_path),
        Route::TestPlan => send_markdown_file(request, &ctx.test_plan_path),
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
        _ => send_status(request, 404),
    }
}

/// The shell page, with the build tag appended to its asset URLs so the
/// browser fetches the current frontend after a relaunch (belt-and-suspenders
/// with no-store).
fn serve_shell_page(request: Request, ctx: &Ctx) -> std::io::Result<()> {
    let html = SHELL_HTML
        .replace(
            "/__wrap/shell.css",
            &format!("/__wrap/shell.css?v={}", ctx.asset_version),
        )
        .replace(
            "/__wrap/shell.js",
            &format!("/__wrap/shell.js?v={}", ctx.asset_version),
        );
    send_bytes_nostore(request, 200, "text/html; charset=utf-8", html.into_bytes())
}

/// A sidebar markdown document, served empty when it does not exist yet.
fn send_markdown_file(request: Request, path: &Path) -> std::io::Result<()> {
    send_bytes_nostore(
        request,
        200,
        "text/markdown; charset=utf-8",
        std::fs::read(path).unwrap_or_default(),
    )
}

fn asset(name: &str) -> Option<(&'static str, &'static str)> {
    match name {
        "shell.css" => Some(("text/css; charset=utf-8", SHELL_CSS)),
        "shell.js" => Some(("application/javascript; charset=utf-8", SHELL_JS)),
        _ => None,
    }
}
