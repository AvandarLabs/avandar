//! The TUI application state and the behaviors the event loop drives.
//!
//! Holds the two PTY panes (difit log + LLM), the focus, the background
//! poller, and the injection [`Dispatcher`]. Pane spawning and teardown live
//! in [`super::startup`]; this module is the in-memory state machine.

use std::path::PathBuf;
use std::time::{Duration, Instant};

use crate::comparison::ComparisonKey;
use crate::difit::poller::Poller;
use crate::git_watcher::GitWatcher;
use crate::inject::dispatcher::Dispatcher;
use crate::inject::held::HeldComments;
use crate::inject::reply_watcher::ReplyWatcher;
use crate::pty_pane::PtyPane;
use crate::session::AgentKind;
use crate::web;

use super::control::ReviewControl;
use super::guide::Guide;
use super::main_diff_view::MainDiffView;
use super::open_target;
use super::palette::{PaletteAction, PaletteState};
use super::start_review::StartReviewModal;
use super::vim::VimState;

mod llm;
mod review_surface;
mod scroll;

/// How long the git diff signature must hold steady after diverging from what
/// difit is showing before `dif` declares the code change "settled" and warns
/// that a restart is needed. Long enough that mid-edit churn doesn't warn
/// prematurely; short enough to feel prompt once the LLM finishes.
const CODE_CHANGE_SETTLE: Duration = Duration::from_secs(3);

/// How recently `dif` must have injected a prompt into the LLM for a settled
/// code change to be credited to the agent rather than to a manual edit.
const LLM_ATTRIBUTION_WINDOW: Duration = Duration::from_secs(120);

/// The prompt `Ctrl+G` (and the palette's "Regenerate diff guide") types into
/// the LLM pane. Intentionally minimal: the skill derives the paths itself.
const REGENERATE_GUIDE_PROMPT: &str = "Regenerate the diff guide for this review using the diff-review skill, \
     and decide whether the diff summary and test plan need to be regenerated too.";

/// Which pane currently receives input / scroll.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Panel {
    /// The left difit server-log pane (read-only; scroll only).
    Difit,
    /// The right LLM conversation pane.
    Llm,
}

/// All TUI state for one review session.
pub struct App {
    /// The difit server, rendered as a read-only log on the left.
    pub difit: PtyPane,
    /// The LLM session on the right; `None` once it exits.
    pub llm: Option<PtyPane>,
    /// Which LLM frontend the right pane is running.
    pub agent_kind: AgentKind,
    /// Configured command used to relaunch the LLM pane.
    pub llm_cmd: String,
    /// Which pane has focus.
    pub focus: Panel,
    /// The difit port (shown in the title; used by the dispatcher).
    pub port: u16,
    /// Host address passed to difit on launch and restart.
    pub difit_host: String,
    /// A label for the difit comparison, e.g. `@ develop` or `.`.
    pub comparison_label: String,
    /// The repo root difit + LLM run in (needed to relaunch difit on a
    /// "Restart diff server" with the original `cd` target).
    pub repo_root: PathBuf,
    /// The comparison difit was launched with, replayed verbatim on restart so
    /// the relaunched server shows the same diff.
    pub comparison: ComparisonKey,
    /// The transcript file, re-read on restart to reseed difit's comments.
    pub transcript_path: PathBuf,
    /// Where the LLM session id is persisted, rewritten when `Ctrl+N` starts
    /// a fresh session so a later `dif` launch can `--resume` it.
    pub session_id_path: PathBuf,
    /// Local control endpoint used by the `diff-review` skill to update the
    /// selected comparison while the TUI is still preparing.
    pub review_control: ReviewControl,
    /// Turns difit snapshots into LLM prompts, once per comment.
    pub dispatcher: Dispatcher,
    /// The comments held for "Send all", saved so a relaunch keeps them.
    pub held_comments: HeldComments,
    /// Bulk vs eager delivery and the PR-bound comments, shared with the
    /// browser shell and the poller.
    pub comment_channels: web::CommentChannels,
    /// Logs each new agent reply to the difit pane, once.
    pub reply_watcher: ReplyWatcher,
    /// The background comments poller. Momentarily absent only while a
    /// comparison retarget swaps difit out.
    pub poller: Option<Poller>,
    /// Background watcher for code changes (so we can warn a restart is needed).
    pub git_watcher: GitWatcher,
    /// The diff signature difit is currently showing. A divergence means the
    /// code changed since launch (or the last restart).
    pub served_sig: Option<String>,
    /// A diverged signature and when it was first observed at that value, used
    /// to wait for changes to settle before warning.
    pub pending_change: Option<(String, Instant)>,
    /// The diff signature we last warned about, if any. A *new* distinct
    /// settled signature re-arms the warning (so a manual edit after a prior
    /// warning still alerts); cleared on restart.
    pub warned_sig: Option<String>,
    /// When `dif` last injected a prompt into the LLM (comment or `Ctrl+G`).
    /// Used to attribute a settled code change to the agent vs. a manual edit.
    pub last_inject_at: Option<Instant>,
    /// Which view the main diff pane is showing (log view or diff guide view).
    pub active_diff_view: MainDiffView,
    /// The diff guide view's backing markdown + scroll.
    pub guide: Guide,
    /// The test plan view's backing markdown + scroll.
    pub test_plan: Guide,
    /// Vim-motion accumulator for the diff guide view (count + `gg` prefix).
    pub vim: VimState,
    /// The live-session metadata file, removed on exit.
    pub session_meta: PathBuf,
    /// The global command palette, open when `Some`.
    pub palette: Option<PaletteState>,
    /// Whether the `Alt+S` keyboard-shortcuts help modal is open.
    pub help_open: bool,
    /// The browser web shell wrapping difit (guide sidebar + per-group views).
    /// Owned here so it lives for the session and shuts down on exit; `None`
    /// before difit starts or if it failed to start.
    pub web_shell: Option<crate::web::WebShell>,
    /// URL opened for the current review.
    pub open_url: Option<String>,
    /// Whether the skill's review artifacts (transcript + both guides) exist.
    /// difit runs regardless; this only tracks whether the *review* is prepared.
    pub guide_ready: bool,
    /// Reserved browser shell port, reused when delayed startup becomes ready.
    pub shell_port: u16,
    /// Reserved control server port for live TUI coordination.
    pub control_port: u16,
    /// Structured guide path required by the browser shell.
    pub guide_json_path: PathBuf,
    /// High-level diff summary path served by the browser shell.
    pub diff_summary_path: PathBuf,
    /// Manual test plan path served by the browser shell and rendered in TUI.
    pub test_plan_path: PathBuf,
    /// Current branch name used in browser shell metadata.
    pub branch: String,
    /// Current worktree name used in browser shell metadata.
    pub worktree: String,
    /// The "no diff review found, start one?" modal, open when `Some`.
    /// Raised at launch when no review is prepared; nothing starts a review
    /// unless the reviewer answers Yes here.
    pub start_review: Option<StartReviewModal>,
    /// Set when the user asks to quit.
    pub should_quit: bool,
}

impl App {
    /// Focus the left difit pane.
    pub const fn focus_difit(&mut self) {
        self.focus = Panel::Difit;
    }

    /// Cycle the main diff pane to the next view (`Tab`), focusing the pane so
    /// the change is visible and its scroll keys apply.
    pub fn cycle_main_view_next(&mut self) {
        self.set_main_view(self.active_diff_view.next());
    }

    /// Cycle the main diff pane to the previous view (`Shift+Tab`).
    pub fn cycle_main_view_prev(&mut self) {
        self.set_main_view(self.active_diff_view.prev());
    }

    /// Set the active main view and focus the (left) diff pane, clearing any
    /// half-typed vim count so it never carries across a view switch.
    const fn set_main_view(&mut self, view: MainDiffView) {
        self.active_diff_view = view;
        self.focus = Panel::Difit;
        self.vim.reset();
    }

    /// Focus the right LLM pane.
    pub const fn focus_llm(&mut self) {
        self.focus = Panel::Llm;
    }

    /// Request shutdown.
    pub const fn quit(&mut self) {
        self.should_quit = true;
    }

    /// Open the global command palette (no-op if already open).
    pub fn open_palette(&mut self) {
        if self.palette.is_none() {
            self.palette = Some(PaletteState::new());
        }
    }

    /// Close the palette, discarding any filter state.
    pub fn close_palette(&mut self) {
        self.palette = None;
    }

    /// Whether the palette is currently open.
    #[must_use]
    pub const fn palette_open(&self) -> bool {
        self.palette.is_some()
    }

    /// Toggle the `Alt+S` keyboard-shortcuts help modal.
    pub const fn toggle_help(&mut self) {
        self.help_open = !self.help_open;
    }

    /// Close the help modal.
    pub const fn close_help(&mut self) {
        self.help_open = false;
    }

    /// Run a palette action and close the palette.
    pub fn execute_palette_action(&mut self, action: PaletteAction) {
        match action {
            PaletteAction::RestartDifit => self.restart_difit(),
            PaletteAction::RegenerateGuide => self.regenerate_guide(),
            PaletteAction::OpenInBrowser => self.open_in_browser(),
            PaletteAction::NewLlmSession => self.new_llm_session(),
        }
        self.close_palette();
    }

    /// Open the review in the system default browser. Prefers the web-shell URL
    /// (guide sidebar + per-group views); falls back to raw difit if the shell
    /// isn't running. Best-effort and never blocks the event loop.
    pub fn open_in_browser(&self) {
        if let Some(url) = self.open_url.as_ref() {
            open_target::open_url(url);
        }
    }
}

/// How many rows a single Alt+U / Alt+D press scrolls a focused PTY pane: half
/// its visible rows, never less than one so a tiny pane still advances.
#[must_use]
pub fn half_page_step(visible_rows: u16) -> usize {
    (usize::from(visible_rows) / 2).max(1)
}

#[cfg(test)]
mod tests {
    use super::half_page_step;

    #[test]
    fn half_page_step_is_half_the_visible_rows() {
        assert_eq!(half_page_step(40), 20);
        assert_eq!(half_page_step(41), 20);
    }

    #[test]
    fn half_page_step_never_falls_below_one_on_tiny_panes() {
        assert_eq!(half_page_step(0), 1);
        assert_eq!(half_page_step(1), 1);
    }
}
