//! The live-session metadata file `.difit/.session-<branch>-<scope>.json`.
//!
//! `dif` writes this while a review is running so the `diff-review` skill
//! can find the difit port + transcript when addressing comments outside an
//! injected prompt. It is best-effort: removed on a clean exit, overwritten on
//! the next launch otherwise.

use std::path::Path;

use serde::Serialize;

/// The on-disk shape skills read to locate the running server.
#[derive(Debug, Serialize)]
pub struct SessionMeta {
    /// The difit server port. The skill POSTs replies here directly — difit
    /// broadcasts them over SSE, which the web shell streams to the browser.
    pub port: u16,
    /// The `dif` process id.
    pub pid: u32,
    /// Absolute path to the transcript file.
    pub comments_file: String,
    /// The comparison key (`.`, `staged`, `working`, or a branch).
    pub comparison_key: String,
    /// The browser web-shell port (the origin the reviewer's browser uses).
    pub shell_port: u16,
    /// The web-shell URL opened in the browser.
    pub shell_url: String,
    /// Local-only control server port for live TUI coordination.
    pub control_port: u16,
    /// Endpoint where the skill can POST the selected comparison key.
    pub comparison_update_url: String,
}

/// Best-effort write of the session metadata as pretty JSON.
pub fn write(path: &Path, meta: &SessionMeta) {
    if let Ok(json) = serde_json::to_string_pretty(meta) {
        let _ = std::fs::write(path, json);
    }
}

/// Best-effort removal on exit.
pub fn remove(path: &Path) {
    let _ = std::fs::remove_file(path);
}
