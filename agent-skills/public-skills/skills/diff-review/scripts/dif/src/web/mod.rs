//! The browser **web shell**: a single-origin reverse proxy in front of difit
//! that adds a guide-as-nav sidebar and per-group filtered views.
//!
//! difit is never forked. It is proxied verbatim; only its HTML document is
//! augmented (one injected `<script>`) and its `/api/diff` response is filtered
//! per group. One origin means one `localStorage`, so difit's "viewed" state
//! and comments stay shared across the full view and every group view.
//!
//! See `docs/web-shell.md` for the full design. Pure core:
//!   - [`router`] — request routing incl. group-from-`Referer`.
//!   - [`filter`] — `/api/diff` `files[]` filter (fail-open).
//!   - [`inject`] — one-time `<script>` injection into difit's HTML.
//!   - [`groups`] — the `-guide.json` roster + per-group file sets.
//!
//! I/O layer: [`proxy`] (ureq upstream calls) and [`server`] (the `tiny_http`
//! request loop). [`WebShell`] owns the server thread.

pub mod filter;
pub mod groups;
pub mod inject;
pub mod meta;
pub mod proxy;
pub mod router;
pub mod server;

use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};
use std::path::PathBuf;
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};
use std::thread::JoinHandle;

use anyhow::{Result, anyhow};
use tiny_http::Server;

use server::Ctx;

/// A short version tag derived from the embedded frontend. It changes whenever
/// any frontend asset changes (i.e. on every rebuilt binary), and is appended as
/// `?v=<tag>` to the `shell.js` / `shell.css` URLs in the served page. Combined
/// with `no-store`, this guarantees a browser can never run a stale frontend
/// after `dif` relaunches with new code: the URL itself differs.
fn asset_version() -> String {
    let mut h = DefaultHasher::new();
    server::SHELL_HTML.hash(&mut h);
    server::SHELL_CSS.hash(&mut h);
    server::SHELL_JS.hash(&mut h);
    server::INJECT_JS.hash(&mut h);
    format!("{:x}", h.finish())
}

/// A running web-shell server. Drop (or [`shutdown`](WebShell::shutdown)) stops it.
pub struct WebShell {
    port: u16,
    server: Arc<Server>,
    handle: Option<JoinHandle<()>>,
    /// Shared with the server: set when the browser asks to regenerate the guide.
    regen: Arc<AtomicBool>,
}

impl WebShell {
    /// Bind the shell on `shell_port` and start serving, proxying to difit on
    /// `difit_port` and reading this review's groups from `guide_json_path`.
    ///
    /// `branch` titles the header; `worktree` is the checkout's directory name,
    /// shown as a pill when it differs from the branch.
    #[allow(clippy::too_many_arguments)]
    pub fn start(
        difit_port: u16,
        shell_port: u16,
        guide_json_path: PathBuf,
        branch: String,
        worktree: String,
        diff_summary_path: PathBuf,
        test_plan_path: PathBuf,
    ) -> Result<Self> {
        let server = Server::http(("127.0.0.1", shell_port))
            .map_err(|e| anyhow!("web shell failed to bind port {shell_port}: {e}"))?;
        let server = Arc::new(server);
        let regen = Arc::new(AtomicBool::new(false));
        let ctx = Arc::new(Ctx {
            difit_port,
            guide_json_path,
            diff_summary_path,
            test_plan_path,
            branch,
            worktree,
            regen: Arc::clone(&regen),
            asset_version: asset_version(),
        });
        let srv = Arc::clone(&server);
        let handle = std::thread::spawn(move || server::serve(&srv, &ctx));
        Ok(Self {
            port: shell_port,
            server,
            handle: Some(handle),
            regen,
        })
    }

    /// Take a pending "regenerate the diff guide" request from the browser,
    /// clearing it. Returns `true` at most once per browser POST; the TUI event
    /// loop polls this each tick and triggers the regeneration when it sees one.
    #[must_use]
    pub fn take_regen_request(&self) -> bool {
        self.regen.swap(false, Ordering::Relaxed)
    }

    /// The URL to open in the browser. Uses `127.0.0.1` to match the shell's
    /// own IPv4 bind, so the shell page and the difit iframe share one origin.
    #[must_use]
    pub fn url(&self) -> String {
        format!("http://127.0.0.1:{}/", self.port)
    }

    /// The port the shell is bound to.
    #[must_use]
    pub const fn port(&self) -> u16 {
        self.port
    }

    /// Stop the server and join its accept thread.
    pub fn shutdown(&mut self) {
        self.server.unblock();
        if let Some(handle) = self.handle.take() {
            let _ = handle.join();
        }
    }
}

impl Drop for WebShell {
    fn drop(&mut self) {
        self.shutdown();
    }
}
