//! The TUI application state and the behaviors the event loop drives.
//!
//! Holds the two PTY panes (difit log + claude), the focus, the background
//! poller, and the injection [`Dispatcher`]. Pane spawning and teardown live
//! in [`super::startup`]; this module is the in-memory state machine.

use std::path::PathBuf;
use std::time::{Duration, Instant};

use crate::comparison::ComparisonKey;
use crate::difit::poller::Poller;
use crate::difit::{server, transcript};
use crate::git_watcher::GitWatcher;
use crate::inject::dispatcher::Dispatcher;
use crate::inject::reply_watcher::ReplyWatcher;
use crate::pty_pane::PtyPane;

use super::change_alert::{change_alert, change_author};
use super::guide::Guide;
use super::keymap::send_prompt_to_pty;
use super::main_diff_view::MainDiffView;
use super::open_target;
use super::palette::{PaletteAction, PaletteState};
use super::vim::{VimMotion, VimState};

/// How long the git diff signature must hold steady after diverging from what
/// difit is showing before `dif` declares the code change "settled" and warns
/// that a restart is needed. Long enough that mid-edit churn doesn't warn
/// prematurely; short enough to feel prompt once claude finishes.
const CODE_CHANGE_SETTLE: Duration = Duration::from_secs(3);

/// How recently `dif` must have injected a prompt into claude for a settled
/// code change to be credited to claude rather than to a manual edit. Wide
/// enough to cover claude thinking + editing after a comment is typed in.
const CLAUDE_ATTRIBUTION_WINDOW: Duration = Duration::from_secs(120);

/// The prompt `Ctrl+D` (and the palette's "Regenerate diff guide") types into
/// the claude pane. Intentionally minimal: the skill derives the paths itself.
const REGENERATE_GUIDE_PROMPT: &str =
    "Regenerate the diff guide for this review using the diff-review skill, \
     then write it to the guide markdown file under .difit/.";

/// The slash command `Ctrl+N` (and the palette's "New Claude session") types
/// and submits into the claude pane. Submitting it starts a fresh claude
/// session so the next prompt lands in a clean context instead of the resumed
/// one.
const NEW_SESSION_COMMAND: &str = "/new";

/// Which pane currently receives input / scroll.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Panel {
    /// The left difit server-log pane (read-only; scroll only).
    Difit,
    /// The right claude conversation pane.
    Claude,
}

/// All TUI state for one review session.
pub struct App {
    /// The difit server, rendered as a read-only log on the left.
    pub difit: PtyPane,
    /// The claude session on the right; `None` once it exits.
    pub claude: Option<PtyPane>,
    /// Which pane has focus.
    pub focus: Panel,
    /// The difit port (shown in the title; used by the dispatcher).
    pub port: u16,
    /// A label for the difit comparison, e.g. `@ develop` or `.`.
    pub comparison_label: String,
    /// The repo root difit + claude run in (needed to relaunch difit on a
    /// "Restart dif" with the original `cd` target).
    pub repo_root: PathBuf,
    /// The comparison difit was launched with, replayed verbatim on restart so
    /// the relaunched server shows the same diff.
    pub comparison: ComparisonKey,
    /// The transcript file, re-read on restart to reseed difit's comments.
    pub transcript_path: PathBuf,
    /// Turns difit snapshots into claude prompts, once per comment.
    pub dispatcher: Dispatcher,
    /// Logs each new `claude` reply to the difit pane, once.
    pub reply_watcher: ReplyWatcher,
    /// The background comments poller.
    pub poller: Poller,
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
    /// When `dif` last injected a prompt into claude (comment or `Ctrl+D`).
    /// Used to attribute a settled code change to claude vs. a manual edit.
    pub last_inject_at: Option<Instant>,
    /// Which view the main diff pane is showing (log view or diff guide view).
    pub active_diff_view: MainDiffView,
    /// The diff guide view's backing markdown + scroll.
    pub guide: Guide,
    /// Vim-motion accumulator for the diff guide view (count + `gg` prefix).
    pub vim: VimState,
    /// The live-session metadata file, removed on exit.
    pub session_meta: PathBuf,
    /// The global command palette, open when `Some`.
    pub palette: Option<PaletteState>,
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

    /// Focus the right claude pane.
    pub const fn focus_claude(&mut self) {
        self.focus = Panel::Claude;
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

    /// Run a palette action and close the palette.
    pub fn execute_palette_action(&mut self, action: PaletteAction) {
        match action {
            PaletteAction::RestartDifit => self.restart_difit(),
            PaletteAction::RegenerateGuide => self.regenerate_guide(),
            PaletteAction::OpenInBrowser => self.open_in_browser(),
            PaletteAction::NewClaudeSession => self.new_claude_session(),
        }
        self.close_palette();
    }

    /// Open the running difit server's URL in the system default browser. Does
    /// not restart the server; best-effort and never blocks the event loop.
    pub fn open_in_browser(&self) {
        let url = format!("http://localhost:{}", self.port);
        let _ = std::process::Command::new("open").arg(&url).spawn();
    }

    /// Ask claude to regenerate the diff guide (via the `diff-review`
    /// skill). `dif` only types the request; the skill writes the guide file,
    /// which the diff guide view then picks up on its next refresh.
    pub fn regenerate_guide(&mut self) {
        if let Some(claude) = self.claude.as_ref().filter(|p| p.is_alive()) {
            send_prompt_to_pty(claude, REGENERATE_GUIDE_PROMPT);
            self.last_inject_at = Some(Instant::now());
        }
    }

    /// Start a fresh claude session by typing `/new` into the claude pane and
    /// submitting it, so the next prompt is answered in a clean session rather
    /// than the resumed one. `dif` only types the command; claude does the
    /// reset. A no-op when the claude pane has exited.
    pub fn new_claude_session(&self) {
        if let Some(claude) = self.claude.as_ref().filter(|p| p.is_alive()) {
            send_prompt_to_pty(claude, NEW_SESSION_COMMAND);
        }
    }

    /// Tear down the difit server and relaunch it with the same comparison,
    /// port, and (freshly re-read) seeded comments. The left pane's log is kept
    /// continuous: `dif` writes its own `[dif]` status lines into the pane and
    /// the new server output appends below them, rather than clearing the pane
    /// or quitting the shell. The claude pane and poller are untouched (the
    /// poller simply reconnects once difit is back on the same port).
    pub fn restart_difit(&mut self) {
        let transcript_raw = transcript::read_raw(&self.transcript_path);
        let command = server::build_command(
            &self.repo_root,
            &self.comparison,
            self.port,
            transcript_raw.as_deref(),
            true, // reopen the review in the browser, matching the original launch
        );
        self.difit
            .write_to_screen("\r\n\x1b[33m[dif] Stopping difit server…\x1b[0m\r\n");
        self.difit.kill_child();
        // Wait for difit to release the port so the relaunch binds the same one
        // (keeping the poller valid) instead of difit silently reassigning.
        let _ = server::wait_until_port_free(self.port, 50);
        self.difit
            .write_to_screen("\x1b[33m[dif] Restarting difit server…\x1b[0m\r\n");
        if let Err(e) = self
            .difit
            .respawn_shell_command_with_env(&command, &[], &self.repo_root)
        {
            self.difit
                .write_to_screen(&format!("\x1b[31m[dif] Failed to restart difit: {e}\x1b[0m\r\n"));
        }
        // The relaunched difit now shows the current diff: re-baseline so the
        // restart warning clears and re-arms for any further changes. If git is
        // momentarily unavailable, `warn_if_code_changed` re-establishes the
        // baseline from the next signature.
        self.served_sig = self.git_watcher.current();
        self.pending_change = None;
        self.warned_sig = None;
    }

    /// Mirror activity into the difit pane log: a line per new `claude` reply,
    /// and a settled warning when the code difit is showing has changed. Also
    /// re-reads the diff guide so the guide view stays current. Called each
    /// tick from the event loop.
    pub fn update_difit_log(&mut self) {
        if let Some(snapshot) = self.poller.latest() {
            for location in self.reply_watcher.new_reply_locations(&snapshot) {
                self.difit.write_to_screen(&format!(
                    "\r\n\x1b[36m💬 Added response to comment on {location}\x1b[0m\r\n"
                ));
            }
        }
        self.guide.refresh();
        self.warn_if_code_changed();
    }

    /// Warn (in orange, in the log view) that difit must be restarted when the
    /// repo's diff signature has diverged from what difit is showing and held
    /// steady. The warning re-arms on each *new* settled signature so a manual
    /// edit after a prior warning still alerts, and names the likely author
    /// (claude vs. a manual edit) from how recently `dif` last injected.
    fn warn_if_code_changed(&mut self) {
        let Some(current) = self.git_watcher.current() else {
            return;
        };
        let Some(served) = self.served_sig.clone() else {
            // Establish the served baseline on the first signature we see.
            self.served_sig = Some(current);
            return;
        };
        if current == served {
            self.pending_change = None;
            return;
        }
        match &self.pending_change {
            Some((sig, since)) if *sig == current => {
                let settled = since.elapsed() >= CODE_CHANGE_SETTLE;
                let already_warned = self.warned_sig.as_deref() == Some(current.as_str());
                if settled && !already_warned {
                    let author = change_author(
                        self.last_inject_at.map(|t| t.elapsed()),
                        CLAUDE_ATTRIBUTION_WINDOW,
                    );
                    self.difit.write_to_screen(&change_alert(author));
                    self.warned_sig = Some(current);
                }
            }
            // Signature changed (or first divergence): start the settle timer.
            _ => self.pending_change = Some((current, Instant::now())),
        }
    }

    /// Whether the claude pane is present and its child still running.
    #[must_use]
    pub fn claude_alive(&self) -> bool {
        self.claude.as_ref().is_some_and(PtyPane::is_alive)
    }

    /// Drop the claude pane if its child has exited (called each tick so the
    /// draw layer can show the "ended" placeholder).
    pub fn reap_claude(&mut self) {
        if self.claude.as_ref().is_some_and(|p| !p.is_alive()) {
            self.claude = None;
        }
    }

    /// Type any newly-open reviewer comments into the claude pane. Checks the
    /// pane is alive *before* consuming snapshots so a dispatch is never lost
    /// to a dead pane.
    pub fn inject_pending(&mut self) {
        let Some(claude) = self.claude.as_ref().filter(|p| p.is_alive()) else {
            return;
        };
        let Some(snapshot) = self.poller.latest() else {
            return;
        };
        let prompts = self.dispatcher.next_prompts(&snapshot);
        if !prompts.is_empty() {
            self.last_inject_at = Some(Instant::now());
        }
        for prompt in prompts {
            send_prompt_to_pty(claude, &prompt);
        }
    }

    /// Whether the diff guide view is the active main view.
    #[must_use]
    pub fn guide_view_active(&self) -> bool {
        self.focus == Panel::Difit && self.active_diff_view == MainDiffView::Guide
    }

    /// Scroll up by `n` rows (mouse wheel / arrows / PageUp). In the diff guide
    /// view this moves the cursor (the view follows it); otherwise the focused
    /// PTY pane scrolls.
    pub fn scroll_focused_up(&mut self, n: usize) {
        if self.guide_view_active() {
            self.guide.cursor_up(u16::try_from(n).unwrap_or(u16::MAX));
        } else if let Some(pane) = self.focused_pane() {
            pane.scroll_up(n);
        }
    }

    /// Scroll down by `n` rows (mouse wheel / arrows / PageDown).
    pub fn scroll_focused_down(&mut self, n: usize) {
        if self.guide_view_active() {
            self.guide.cursor_down(u16::try_from(n).unwrap_or(u16::MAX));
        } else if let Some(pane) = self.focused_pane() {
            pane.scroll_down(n);
        }
    }

    /// Scroll the focused view a half-page in `up`'s direction (Alt+U / Alt+D).
    /// The diff guide moves its cursor by a half-page (matching bare `d`/`u`);
    /// a focused PTY pane scrolls its scrollback by half its visible rows.
    /// Intercepted before keys reach Claude, so it fires while Claude is
    /// focused too.
    pub fn scroll_focused_half_page(&mut self, up: bool) {
        if self.guide_view_active() {
            if up {
                self.guide.half_page_up();
            } else {
                self.guide.half_page_down();
            }
        } else if let Some(pane) = self.focused_pane() {
            let step = half_page_step(pane.rows);
            if up {
                pane.scroll_up(step);
            } else {
                pane.scroll_down(step);
            }
        }
    }

    /// Feed a character to the diff guide's vim navigator and apply the motion
    /// it completes, if any. Only meaningful while the guide view is active.
    pub fn guide_vim_char(&mut self, c: char) {
        if let Some(motion) = self.vim.feed(c) {
            self.apply_guide_motion(motion);
        }
    }

    /// Apply a completed [`VimMotion`] to the diff guide view.
    fn apply_guide_motion(&mut self, motion: VimMotion) {
        match motion {
            VimMotion::Down(n) => self.guide.cursor_down(n),
            VimMotion::Up(n) => self.guide.cursor_up(n),
            VimMotion::Left(n) => self.guide.cursor_left(n),
            VimMotion::Right(n) => self.guide.cursor_right(n),
            VimMotion::WordForward(n) => self.guide.word_forward(n),
            VimMotion::WordBack(n) => self.guide.word_back(n),
            VimMotion::HalfPageDown => self.guide.half_page_down(),
            VimMotion::HalfPageUp => self.guide.half_page_up(),
            VimMotion::Top => self.guide.to_top(),
            VimMotion::Bottom => self.guide.to_bottom(),
            VimMotion::Open => self.open_under_cursor(),
        }
    }

    /// Open the path/URL under the diff guide's cursor (the `o` key). A no-op
    /// when the cursor isn't on a path/URL token.
    fn open_under_cursor(&self) {
        if let Some(target) = self.guide.target_under_cursor() {
            open_target::open(&target, &self.repo_root);
        }
    }

    /// The pane currently focused, if it exists.
    const fn focused_pane(&self) -> Option<&PtyPane> {
        match self.focus {
            Panel::Difit => Some(&self.difit),
            Panel::Claude => self.claude.as_ref(),
        }
    }
}

/// How many rows a single Alt+U / Alt+D press scrolls a focused PTY pane: half
/// its visible rows, never less than one so a tiny pane still advances.
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
