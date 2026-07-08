//! Bringing a review online: resolve the comparison, spawn difit + claude,
//! start the poller, and assemble the [`App`].
//!
//! The claude session is resumable across `dif` launches: we remember its id
//! in `.difit/.claude-session-<branch>-<scope>` and `--resume` it when its
//! transcript still exists on disk, else start a fresh session.

use std::fs;
use std::path::{Path, PathBuf};
use std::time::Duration;

use anyhow::Result;

use crate::cli::Cli;
use crate::comparison::ComparisonKey;
use crate::difit::poller::Poller;
use crate::difit::{server, transcript};
use crate::git::{self, Git};
use crate::git_watcher::GitWatcher;
use crate::inject::dispatcher::Dispatcher;
use crate::inject::reply_watcher::ReplyWatcher;
use crate::paths;
use crate::pty_pane::PtyPane;
use crate::session::{self, Plan};
use crate::slug;

use super::app::{App, Panel};
use super::session_meta::{self, SessionMeta};

/// Placeholder PTY size; the first draw resizes both panes to the real layout.
const INITIAL_ROWS: u16 = 24;
/// Placeholder PTY columns.
const INITIAL_COLS: u16 = 80;

/// Launch difit + claude + the poller and return the assembled [`App`].
pub fn launch(cli: &Cli) -> Result<App> {
    let repo_root = git::repo_root()?;
    let branch = git::current_branch()?;
    let comparison = git::resolve_comparison_key(cli.comparison_key.as_deref(), &Git);

    let branch_slug = slug::branch_slug(&branch);
    let scope_slug = comparison.scope_slug();
    let port = server::pick_port(slug::port_for(&branch_slug, &scope_slug));

    let transcript_path = paths::transcript_path(&repo_root, &branch_slug, &scope_slug);
    let session_id_path = paths::session_id_path(&repo_root, &branch_slug, &scope_slug);
    let session_meta_path = paths::session_meta_path(&repo_root, &branch_slug, &scope_slug);
    let guide_path = paths::guide_path(&repo_root, &branch_slug, &scope_slug);
    let _ = fs::create_dir_all(paths::difit_dir(&repo_root));

    let transcript_raw = transcript::read_raw(&transcript_path);
    let difit = server::spawn(
        &repo_root,
        &comparison,
        port,
        transcript_raw.as_deref(),
        true, // open the review in a browser (difit's default)
        INITIAL_ROWS,
        INITIAL_COLS,
    )?;
    let _ready = server::wait_until_ready(port, 50);

    let claude = spawn_claude(&repo_root, &session_id_path);

    session_meta::write(
        &session_meta_path,
        &SessionMeta {
            port,
            pid: std::process::id(),
            comments_file: transcript_path.display().to_string(),
            comparison_key: comparison.key(),
        },
    );

    let poller = Poller::start(port, transcript_path.clone(), Duration::from_secs(1));
    let git_watcher = GitWatcher::start(repo_root.clone(), Duration::from_secs(1));
    let served_sig = git::diff_signature(&repo_root);
    let dispatcher = Dispatcher::new();

    Ok(App {
        difit,
        claude,
        // Start on the diff main view (left), not the claude pane: the review
        // begins by looking at the diff, and claude is already busy loading the
        // skill from its auto-submitted initial prompt (see `spawn_claude`).
        focus: Panel::Difit,
        port,
        comparison_label: comparison_label(&comparison),
        repo_root,
        comparison,
        transcript_path,
        session_id_path,
        dispatcher,
        reply_watcher: ReplyWatcher::new(),
        poller,
        git_watcher,
        served_sig,
        pending_change: None,
        warned_sig: None,
        last_inject_at: None,
        active_diff_view: super::main_diff_view::MainDiffView::Log,
        guide: super::guide::Guide::new(guide_path),
        vim: super::vim::VimState::new(),
        session_meta: session_meta_path,
        palette: None,
        should_quit: false,
    })
}

/// Spawn the claude pane, resuming the saved session when possible.
fn spawn_claude(repo_root: &Path, session_id_path: &Path) -> Option<PtyPane> {
    let command = resume_candidate(repo_root, session_id_path).map_or_else(
        || fresh_claude_command(repo_root, session_id_path),
        |id| {
            // A resumed session already carries the review context.
            let plan = Plan::Resume(id);
            session::build_claude_command(repo_root, &plan, session::initial_prompt(&plan))
        },
    );
    PtyPane::spawn_shell_command_with_env(&command, &[], repo_root, INITIAL_ROWS, INITIAL_COLS).ok()
}

/// Mint a fresh claude session and return the shell command that launches it.
///
/// Generates a new session id, persists it to `session_id_path` (so a later
/// `dif` launch can `--resume` this session), and builds the launch command
/// with the initial review prompt auto-submitted on startup. Shared by the
/// pane's first launch ([`spawn_claude`]) and the `Ctrl+N` respawn
/// ([`App::new_claude_session`](super::app::App::new_claude_session)) so both
/// start a fresh session identically.
pub(crate) fn fresh_claude_command(repo_root: &Path, session_id_path: &Path) -> String {
    let id = uuid::Uuid::new_v4().to_string();
    let _ = fs::write(session_id_path, &id);
    let plan = Plan::Fresh(id);
    // A fresh session is launched already oriented on the review (the prompt is
    // submitted on startup).
    session::build_claude_command(repo_root, &plan, session::initial_prompt(&plan))
}

/// The saved session id, but only if `claude --resume` would find it.
fn resume_candidate(repo_root: &Path, session_id_path: &Path) -> Option<String> {
    let id = fs::read_to_string(session_id_path).ok()?.trim().to_owned();
    if id.is_empty() {
        return None;
    }
    session_transcript_exists(repo_root, &id).then_some(id)
}

/// Whether `~/.claude/projects/<project-dir>/<id>.jsonl` exists.
fn session_transcript_exists(repo_root: &Path, id: &str) -> bool {
    let Some(home) = std::env::var_os("HOME") else {
        return false;
    };
    PathBuf::from(home)
        .join(".claude")
        .join("projects")
        .join(session::project_dir_name(repo_root))
        .join(format!("{id}.jsonl"))
        .is_file()
}

/// A short human label for the comparison, e.g. `@ develop` or `.`.
fn comparison_label(comparison: &ComparisonKey) -> String {
    comparison.difit_args().join(" ")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn fresh_claude_command_persists_id_and_seeds_the_prompt() {
        let dir = tempfile::tempdir().expect("tempdir");
        let session_id_path = dir.path().join("session-id");

        let command = fresh_claude_command(dir.path(), &session_id_path);

        // The id is persisted so a later `dif` launch can `--resume` it...
        let id = fs::read_to_string(&session_id_path).expect("id written");
        assert!(!id.trim().is_empty(), "a fresh id must be written");
        // ...the launch command starts that exact fresh session...
        assert!(command.contains("--session-id"), "launches a fresh session");
        assert!(command.contains(id.trim()), "launches the persisted id");
        // ...already oriented on the review (the initial prompt is submitted).
        assert!(command.contains("/diff-review"), "seeds the review prompt");
    }

    #[test]
    fn fresh_claude_command_mints_a_distinct_id_each_call() {
        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir.path().join("session-id");

        let _ = fresh_claude_command(dir.path(), &path);
        let first = fs::read_to_string(&path).expect("first id");
        let _ = fresh_claude_command(dir.path(), &path);
        let second = fs::read_to_string(&path).expect("second id");

        assert_ne!(first, second, "each Ctrl+N respawn is a distinct session");
    }
}
