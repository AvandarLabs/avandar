//! Spawning and addressing the difit server.
//!
//! `dif` runs difit inside a read-only [`PtyPane`] so the left pane shows the
//! server's own output/log. We pick a confirmed-free port up front (difit
//! would otherwise silently auto-reassign an occupied one, leaving the poller
//! pointed at the wrong port) and seed difit with the existing transcript via
//! `--comment`.

use std::net::TcpListener;
use std::path::Path;
use std::time::Duration;

use anyhow::Result;

use crate::comparison::ComparisonKey;
use crate::pty_pane::PtyPane;
use crate::session::shell_quote;

/// Choose a difit port: `preferred` if it is bindable right now, otherwise an
/// OS-assigned free port. Avoids difit silently reassigning behind our back.
#[must_use]
pub fn pick_port(preferred: u16) -> u16 {
    if TcpListener::bind(("127.0.0.1", preferred)).is_ok() {
        return preferred;
    }
    TcpListener::bind(("127.0.0.1", 0))
        .ok()
        .and_then(|l| l.local_addr().ok())
        .map_or(preferred, |addr| addr.port())
}

/// Build the shell command that launches difit:
/// `cd <repo> && exec difit <args…> --port <p> --keep-alive --include-untracked
/// [--comment <json>] [--no-open]`.
///
/// `transcript_raw` is the existing transcript text (already validated as
/// non-empty by the caller); when present it seeds difit's initial comments.
/// `open_browser` lets real launches open the review in a browser (difit's
/// default) while tests suppress it with `--no-open`.
///
/// `exec` replaces the wrapping shell with difit so the pane's tracked PID is
/// difit itself. That makes [`PtyPane::kill_child`](crate::pty_pane::PtyPane)
/// land a signal directly on difit (rather than leaving an orphaned server
/// holding the port) when the "Restart dif" palette command tears it down.
#[must_use]
pub fn build_command(
    repo_root: &Path,
    comparison: &ComparisonKey,
    port: u16,
    transcript_raw: Option<&str>,
    open_browser: bool,
) -> String {
    let mut parts = vec![
        "cd".to_owned(),
        shell_quote(&repo_root.display().to_string()),
        "&&".to_owned(),
        "exec".to_owned(),
        "difit".to_owned(),
    ];
    for arg in comparison.difit_args() {
        parts.push(shell_quote(&arg));
    }
    parts.push("--port".to_owned());
    parts.push(port.to_string());
    parts.push("--keep-alive".to_owned());
    parts.push("--include-untracked".to_owned());
    if !open_browser {
        parts.push("--no-open".to_owned());
    }
    if let Some(raw) = transcript_raw {
        parts.push("--comment".to_owned());
        parts.push(shell_quote(raw));
    }
    parts.join(" ")
}

/// Spawn difit in a read-only PTY pane.
pub fn spawn(
    repo_root: &Path,
    comparison: &ComparisonKey,
    port: u16,
    transcript_raw: Option<&str>,
    open_browser: bool,
    rows: u16,
    cols: u16,
) -> Result<PtyPane> {
    let command = build_command(repo_root, comparison, port, transcript_raw, open_browser);
    PtyPane::spawn_shell_command_with_env(&command, &[], repo_root, rows, cols)
}

/// Block until `port` is bindable again (up to ~`tries` × 40ms).
///
/// Used by "Restart dif" between killing the old server and spawning the new
/// one, so the relaunched difit binds the same port (keeping the poller valid)
/// instead of silently auto-reassigning. Returns `true` once the port is free,
/// `false` if it stayed occupied for the whole window.
#[must_use]
pub fn wait_until_port_free(port: u16, tries: u32) -> bool {
    for _ in 0..tries {
        if TcpListener::bind(("127.0.0.1", port)).is_ok() {
            return true;
        }
        std::thread::sleep(Duration::from_millis(40));
    }
    false
}

/// Block (up to ~`tries` × 200ms) until difit answers `/api/comments-json`,
/// so callers know the server has bound before starting the poller / browser.
#[must_use]
pub fn wait_until_ready(port: u16, tries: u32) -> bool {
    let url = format!("http://localhost:{port}/api/comments-json");
    for _ in 0..tries {
        if ureq::get(&url)
            .timeout(Duration::from_millis(500))
            .call()
            .is_ok()
        {
            return true;
        }
        std::thread::sleep(Duration::from_millis(200));
    }
    false
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn command_for_branch_uses_at_form_and_flags() {
        let cmd = build_command(
            Path::new("/r"),
            &ComparisonKey::Branch("develop".to_owned()),
            4711,
            None,
            true,
        );
        assert!(cmd.starts_with("cd '/r' && exec difit"));
        assert!(cmd.contains(" '@' 'develop' "));
        assert!(cmd.contains("--port 4711"));
        assert!(cmd.contains("--keep-alive"));
        assert!(cmd.contains("--include-untracked"));
        assert!(!cmd.contains("--comment"));
        assert!(!cmd.contains("--no-open"), "open_browser=true omits --no-open");
    }

    #[test]
    fn command_for_uncommitted_passes_dot() {
        let cmd = build_command(Path::new("/r"), &ComparisonKey::Uncommitted, 4500, None, true);
        assert!(cmd.contains(" '.' "));
    }

    #[test]
    fn no_open_flag_present_when_browser_suppressed() {
        let cmd = build_command(Path::new("/r"), &ComparisonKey::Staged, 4500, None, false);
        assert!(cmd.contains("--no-open"));
    }

    #[test]
    fn comment_arg_present_when_transcript_supplied() {
        let cmd = build_command(
            Path::new("/r"),
            &ComparisonKey::Staged,
            4500,
            Some(r#"[{"type":"thread"}]"#),
            true,
        );
        assert!(cmd.contains("--comment "));
        assert!(cmd.contains("thread"));
    }

    #[test]
    fn pick_port_returns_free_preferred() {
        // Bind an ephemeral port, learn it, free it, then confirm pick_port
        // hands it back (it is free again).
        let listener = TcpListener::bind(("127.0.0.1", 0)).unwrap();
        let free = listener.local_addr().unwrap().port();
        drop(listener);
        assert_eq!(pick_port(free), free);
    }

    #[test]
    fn pick_port_falls_back_when_occupied() {
        let listener = TcpListener::bind(("127.0.0.1", 0)).unwrap();
        let occupied = listener.local_addr().unwrap().port();
        // Held open, so pick_port must return a different, free port.
        let chosen = pick_port(occupied);
        assert_ne!(chosen, occupied);
    }

    #[test]
    fn wait_until_port_free_returns_true_for_a_free_port() {
        let listener = TcpListener::bind(("127.0.0.1", 0)).unwrap();
        let port = listener.local_addr().unwrap().port();
        drop(listener);
        assert!(wait_until_port_free(port, 5));
    }

    #[test]
    fn wait_until_port_free_returns_false_while_occupied() {
        let listener = TcpListener::bind(("127.0.0.1", 0)).unwrap();
        let port = listener.local_addr().unwrap().port();
        // Held open for the duration, so the port never frees.
        assert!(!wait_until_port_free(port, 3));
    }
}
