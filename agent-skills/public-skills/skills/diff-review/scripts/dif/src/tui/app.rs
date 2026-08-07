//! The TUI application state and the behaviors the event loop drives.
//!
//! Holds the two PTY panes (difit log + LLM), the focus, the background
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
use crate::paths;
use crate::pty_pane::PtyPane;
use crate::session::AgentKind;
use crate::slug;
use crate::web;

use super::change_alert::{change_alert_for, change_author};
use super::control::ReviewControl;
use super::guide::Guide;
use super::keymap::send_prompt_to_pty;
use super::main_diff_view::MainDiffView;
use super::open_target;
use super::palette::{PaletteAction, PaletteState};
use super::session_meta::{self, SessionMeta};
use super::startup::{
    comparison_label, fresh_llm_command, fresh_llm_command_with_prompt, review_files_ready,
};
use super::vim::{VimMotion, VimState};

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
    /// First prompt for fresh LLM sessions in this launch mode.
    pub fresh_llm_prompt: Option<String>,
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
            super::open_target::open_url(url);
        }
    }

    /// Service a pending "Regenerate guide" request from the browser web shell.
    ///
    /// The shell server (a background thread) can't type into the LLM pane
    /// itself, so it flags the request and this, polled each event-loop tick,
    /// runs the same regeneration as `Ctrl+G`. A no-op when nothing is pending.
    pub fn poll_web_shell_requests(&mut self) {
        self.apply_pending_comparison_update();
        if self
            .web_shell
            .as_ref()
            .is_some_and(crate::web::WebShell::take_regen_request)
        {
            self.difit.write_to_screen(
                "\r\n\x1b[36m↻ Regenerating diff guide (requested from the browser)…\x1b[0m\r\n",
            );
            self.regenerate_guide();
        }
    }

    /// Apply a comparison the skill selected inside this already-open TUI.
    ///
    /// difit now runs from launch, so honoring an update means relaunching it on
    /// the new comparison. That is only ever safe while the review is still
    /// being prepared: once a guide exists, or once the reviewer has commented,
    /// a live review is never switched out from under the browser.
    fn apply_pending_comparison_update(&mut self) {
        let Some(key) = self.review_control.take_comparison_key() else {
            return;
        };
        let next_comparison = ComparisonKey::parse(&key);
        if next_comparison == self.comparison {
            return;
        }
        if self.guide_ready || self.has_comments() {
            self.difit.write_to_screen(&format!(
                "\r\n\x1b[33m[dif] Ignoring comparison update to {}: this review is already underway.\x1b[0m\r\n",
                comparison_label(&next_comparison)
            ));
            return;
        }
        self.retarget_pending_review(next_comparison);
    }

    /// Whether difit is holding any comment thread at all.
    fn has_comments(&self) -> bool {
        self.poller
            .as_ref()
            .and_then(Poller::latest)
            .is_some_and(|snapshot| !snapshot.threads.is_empty())
    }

    fn retarget_pending_review(&mut self, comparison: ComparisonKey) {
        session_meta::remove(&self.session_meta);
        let branch_slug = slug::branch_slug(&self.branch);
        let scope_slug = comparison.scope_slug();
        self.comparison_label = comparison_label(&comparison);
        self.port = server::pick_port(slug::port_for(&branch_slug, &scope_slug));
        self.shell_port =
            server::pick_port(slug::port_for(&format!("{branch_slug}-shell"), &scope_slug));
        self.transcript_path = paths::transcript_path(&self.repo_root, &branch_slug, &scope_slug);
        self.session_id_path =
            paths::llm_session_id_path(&self.repo_root, self.agent_kind, &branch_slug, &scope_slug);
        self.session_meta = paths::session_meta_path(&self.repo_root, &branch_slug, &scope_slug);
        self.guide_json_path = paths::guide_json_path(&self.repo_root, &branch_slug, &scope_slug);
        self.diff_summary_path =
            paths::diff_summary_path(&self.repo_root, &branch_slug, &scope_slug);
        self.test_plan_path = paths::test_plan_path(&self.repo_root, &branch_slug, &scope_slug);
        self.guide = Guide::new(paths::guide_path(
            &self.repo_root,
            &branch_slug,
            &scope_slug,
        ));
        self.test_plan = Guide::new(self.test_plan_path.clone());
        self.vim.reset();
        self.comparison = comparison;
        self.difit.write_to_screen(&format!(
            "\r\n\x1b[36m[dif] Review comparison selected: {}. Relaunching the diff…\x1b[0m\r\n",
            self.comparison_label
        ));
        self.relaunch_review_surface();
    }

    /// Point difit, the poller, the browser shell, and the session metadata at
    /// the current comparison's ports and paths, then reopen the browser.
    ///
    /// The difit pane is reused so its log stays continuous. The old poller and
    /// shell are dropped first: they address the previous ports and must not
    /// outlive them.
    fn relaunch_review_surface(&mut self) {
        self.poller = None;
        self.web_shell = None;
        let _ = transcript::ensure_exists(&self.transcript_path);
        let transcript_raw = transcript::read_raw(&self.transcript_path);
        let command = server::build_command(
            &self.repo_root,
            &self.comparison,
            self.port,
            &self.difit_host,
            transcript_raw.as_deref(),
            false,
        );
        self.difit.kill_child();
        if let Err(e) = self
            .difit
            .respawn_shell_command_with_env(&command, &[], &self.repo_root)
        {
            self.difit.write_to_screen(&format!(
                "\x1b[31m[dif] Failed to start difit: {e}\x1b[0m\r\n"
            ));
            return;
        }
        self.poller = Some(Poller::start(
            self.port,
            self.transcript_path.clone(),
            Duration::from_secs(1),
        ));
        self.web_shell = web::WebShell::start(
            self.port,
            self.shell_port,
            self.guide_json_path.clone(),
            self.branch.clone(),
            self.worktree.clone(),
            self.diff_summary_path.clone(),
            self.test_plan_path.clone(),
        )
        .ok();
        let open_url = self.web_shell.as_ref().map_or_else(
            || format!("http://localhost:{}/", self.port),
            web::WebShell::url,
        );
        self.write_session_meta(Some(open_url.clone()));
        self.open_url = Some(open_url.clone());
        self.served_sig = self.git_watcher.current();
        self.pending_change = None;
        self.warned_sig = None;
        super::open_target::open_url(&open_url);
    }

    /// Ask the LLM to regenerate the diff guide (via the `diff-review`
    /// skill). `dif` only types the request; the skill writes the guide file,
    /// which the diff guide view then picks up on its next refresh.
    pub fn regenerate_guide(&mut self) {
        if let Some(llm) = self.llm.as_ref().filter(|p| p.is_alive()) {
            send_prompt_to_pty(llm, REGENERATE_GUIDE_PROMPT, self.agent_kind);
            self.last_inject_at = Some(Instant::now());
        }
    }

    /// Interrupt the current LLM session and start a brand-new one in the
    /// pane.
    ///
    /// `Ctrl+N` is treated as an *interrupt*, not a queued message: typing
    /// `/new` would merely land in the LLM's input queue and, if it were
    /// mid-thought, could sit unsent for minutes (and the follow-up seed prompt
    /// with it). So instead we kill the running child and respawn the
    /// pane on a fresh session that auto-submits the review prompt on startup,
    /// exactly as the pane's first launch does (see [`fresh_llm_command`]).
    /// Respawning reuses the pane, so its size and scrollback log carry over. A
    /// no-op when the LLM pane never spawned.
    pub fn new_llm_session(&mut self) {
        let Some(llm) = self.llm.as_mut() else {
            return;
        };
        let label = self.agent_kind.label();
        llm.write_to_screen(&format!(
            "\r\n\x1b[33m[dif] Starting a new {label} session...\x1b[0m\r\n"
        ));
        llm.kill_child();
        let command = fresh_llm_command(
            &self.repo_root,
            &self.session_id_path,
            self.agent_kind,
            &self.llm_cmd,
        );
        let command = self.fresh_llm_prompt.as_deref().map_or(command, |prompt| {
            fresh_llm_command_with_prompt(
                &self.repo_root,
                &self.session_id_path,
                self.agent_kind,
                &self.llm_cmd,
                Some(prompt),
            )
        });
        if let Err(e) = llm.respawn_shell_command_with_env(&command, &[], &self.repo_root) {
            llm.write_to_screen(&format!(
                "\x1b[31m[dif] Failed to start a new {label} session: {e}\x1b[0m\r\n"
            ));
        }
    }

    /// Tear down the difit server and relaunch it with the same comparison,
    /// port, and (freshly re-read) seeded comments. The left pane's log is kept
    /// continuous: `dif` writes its own `[dif]` status lines into the pane and
    /// the new server output appends below them, rather than clearing the pane
    /// or quitting the shell. The LLM pane and poller are untouched (the
    /// poller simply reconnects once difit is back on the same port).
    pub fn restart_difit(&mut self) {
        let transcript_raw = transcript::read_raw(&self.transcript_path);
        let command = server::build_command(
            &self.repo_root,
            &self.comparison,
            self.port,
            &self.difit_host,
            transcript_raw.as_deref(),
            // difit must not open its own frontend: the web shell owns the
            // browser surface, so restart spawns difit with `--no-open` (exactly
            // as the original launch) and we reopen the *shell* URL below.
            false,
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
            self.difit.write_to_screen(&format!(
                "\x1b[31m[dif] Failed to restart difit: {e}\x1b[0m\r\n"
            ));
        }
        // The relaunched difit now shows the current diff: re-baseline so the
        // restart warning clears and re-arms for any further changes. If git is
        // momentarily unavailable, `warn_if_code_changed` re-establishes the
        // baseline from the next signature.
        self.served_sig = self.git_watcher.current();
        self.pending_change = None;
        self.warned_sig = None;
        // Reopen the review in the browser at the wrapped-shell URL (difit was
        // told not to), matching the original launch surface.
        self.open_in_browser();
    }

    /// Mirror activity into the difit pane log: a line per new agent reply,
    /// and a settled warning when the code difit is showing has changed. Also
    /// re-reads the diff guide so the guide view stays current. Called each
    /// tick from the event loop.
    pub fn update_difit_log(&mut self) {
        self.note_guide_ready();
        if let Some(snapshot) = self.poller.as_ref().and_then(Poller::latest) {
            for location in self.reply_watcher.new_reply_locations(&snapshot) {
                self.difit.write_to_screen(&format!(
                    "\r\n\x1b[36m💬 Added response to comment on {location}\x1b[0m\r\n"
                ));
            }
        }
        self.guide.refresh();
        self.test_plan.refresh();
        self.warn_if_code_changed();
    }

    /// Notice, once, that the LLM finished preparing the review.
    ///
    /// Nothing has to be started: difit and the browser shell have been serving
    /// the diff since launch, and the shell polls the guide, summary, and test
    /// plan in on its own. This only records that the comparison is now settled
    /// (so the skill can no longer retarget it) and says so in the pane.
    fn note_guide_ready(&mut self) {
        if self.guide_ready {
            return;
        }
        let guide_path = self.guide.path().to_path_buf();
        if !review_files_ready(&self.transcript_path, &guide_path, &self.guide_json_path) {
            return;
        }
        self.guide_ready = true;
        self.review_control.set_accepts_updates(false);
        self.difit.write_to_screen(
            "\r\n\x1b[36m[dif] Diff guide ready — the browser sidebar is filling in.\x1b[0m\r\n",
        );
    }

    pub(crate) fn write_session_meta(&self, shell_url: Option<String>) {
        session_meta::write(
            &self.session_meta,
            &self.session_meta_for(
                shell_url.unwrap_or_else(|| format!("http://localhost:{}/", self.port)),
            ),
        );
    }

    fn session_meta_for(&self, shell_url: String) -> SessionMeta {
        SessionMeta {
            port: self.port,
            pid: std::process::id(),
            comments_file: self.transcript_path.display().to_string(),
            comparison_key: self.comparison.key(),
            shell_port: self.shell_port,
            shell_url,
            control_port: self.control_port,
            comparison_update_url: self.review_control.comparison_url(),
        }
    }

    /// Warn (in orange, in the log view) that difit must be restarted when the
    /// repo's diff signature has diverged from what difit is showing and held
    /// steady. The warning re-arms on each *new* settled signature so a manual
    /// edit after a prior warning still alerts, and names the likely author
    /// (agent vs. a manual edit) from how recently `dif` last injected.
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
                        LLM_ATTRIBUTION_WINDOW,
                    );
                    self.difit
                        .write_to_screen(&change_alert_for(author, self.agent_kind.label()));
                    self.warned_sig = Some(current);
                }
            }
            // Signature changed (or first divergence): start the settle timer.
            _ => self.pending_change = Some((current, Instant::now())),
        }
    }

    /// Whether the LLM pane is present and its child still running.
    #[must_use]
    pub fn llm_alive(&self) -> bool {
        self.llm.as_ref().is_some_and(PtyPane::is_alive)
    }

    /// Drop the LLM pane if its child has exited (called each tick so the
    /// draw layer can show the "ended" placeholder).
    pub fn reap_llm(&mut self) {
        if self.llm.as_ref().is_some_and(|p| !p.is_alive()) {
            self.llm = None;
        }
    }

    /// Type any newly-open reviewer comments into the LLM pane. Checks the
    /// pane is alive *before* consuming snapshots so a dispatch is never lost
    /// to a dead pane.
    pub fn inject_pending(&mut self) {
        let Some(llm) = self.llm.as_ref().filter(|p| p.is_alive()) else {
            return;
        };
        let Some(snapshot) = self.poller.as_ref().and_then(Poller::latest) else {
            return;
        };
        let prompts = self.dispatcher.next_prompts(&snapshot);
        if !prompts.is_empty() {
            self.last_inject_at = Some(Instant::now());
        }
        for prompt in prompts {
            send_prompt_to_pty(llm, &prompt, self.agent_kind);
        }
    }

    /// Whether a markdown-backed main view is active.
    #[must_use]
    pub fn markdown_view_active(&self) -> bool {
        self.focus == Panel::Difit
            && matches!(
                self.active_diff_view,
                MainDiffView::TestPlan | MainDiffView::Guide
            )
    }

    const fn active_markdown(&mut self) -> &mut Guide {
        match self.active_diff_view {
            MainDiffView::TestPlan => &mut self.test_plan,
            _ => &mut self.guide,
        }
    }

    /// Scroll up by `n` rows (mouse wheel / arrows / PageUp). In the diff guide
    /// view this moves the cursor (the view follows it); otherwise the focused
    /// PTY pane scrolls.
    pub fn scroll_focused_up(&mut self, n: usize) {
        if self.markdown_view_active() {
            self.active_markdown()
                .cursor_up(u16::try_from(n).unwrap_or(u16::MAX));
        } else if let Some(pane) = self.focused_pane() {
            pane.scroll_up(n);
        }
    }

    /// Scroll down by `n` rows (mouse wheel / arrows / PageDown).
    pub fn scroll_focused_down(&mut self, n: usize) {
        if self.markdown_view_active() {
            self.active_markdown()
                .cursor_down(u16::try_from(n).unwrap_or(u16::MAX));
        } else if let Some(pane) = self.focused_pane() {
            pane.scroll_down(n);
        }
    }

    /// Scroll the focused view a half-page in `up`'s direction (Alt+U / Alt+D).
    /// The diff guide moves its cursor by a half-page (matching bare `d`/`u`);
    /// a focused PTY pane scrolls its scrollback by half its visible rows.
    /// Intercepted before keys reach the LLM, so it fires while the LLM is
    /// focused too.
    pub fn scroll_focused_half_page(&mut self, up: bool) {
        if self.markdown_view_active() {
            if up {
                self.active_markdown().half_page_up();
            } else {
                self.active_markdown().half_page_down();
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

    /// Feed a character to the active markdown view's vim navigator and apply
    /// the motion it completes, if any.
    pub fn guide_vim_char(&mut self, c: char) {
        if let Some(motion) = self.vim.feed(c) {
            self.apply_guide_motion(motion);
        }
    }

    /// Apply a completed [`VimMotion`] to the diff guide view.
    fn apply_guide_motion(&mut self, motion: VimMotion) {
        match motion {
            VimMotion::Down(n) => self.active_markdown().cursor_down(n),
            VimMotion::Up(n) => self.active_markdown().cursor_up(n),
            VimMotion::Left(n) => self.active_markdown().cursor_left(n),
            VimMotion::Right(n) => self.active_markdown().cursor_right(n),
            VimMotion::WordForward(n) => self.active_markdown().word_forward(n),
            VimMotion::WordBack(n) => self.active_markdown().word_back(n),
            VimMotion::HalfPageDown => self.active_markdown().half_page_down(),
            VimMotion::HalfPageUp => self.active_markdown().half_page_up(),
            VimMotion::Top => self.active_markdown().to_top(),
            VimMotion::Bottom => self.active_markdown().to_bottom(),
            VimMotion::Open => self.open_under_cursor(),
        }
    }

    /// Open the path/URL under the diff guide's cursor (the `o` key). A no-op
    /// when the cursor isn't on a path/URL token.
    fn open_under_cursor(&self) {
        let target = match self.active_diff_view {
            MainDiffView::TestPlan => self.test_plan.target_under_cursor(),
            _ => self.guide.target_under_cursor(),
        };
        if let Some(target) = target {
            open_target::open(&target, &self.repo_root);
        }
    }

    /// The pane currently focused, if it exists.
    const fn focused_pane(&self) -> Option<&PtyPane> {
        match self.focus {
            Panel::Difit => Some(&self.difit),
            Panel::Llm => self.llm.as_ref(),
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
