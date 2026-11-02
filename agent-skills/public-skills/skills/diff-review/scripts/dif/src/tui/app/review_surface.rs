//! Retargeting and relaunching the review surface: the web shell's requests
//! (regenerate the guide, resolve a pull's merge conflicts), a comparison
//! change, a fresh LLM session, and a difit restart.

use std::time::Instant;

use crate::comparison::ComparisonKey;
use crate::difit::poller::Poller;
use crate::difit::{server, transcript};
use crate::github::conflicts::{resolve_prompt, reviewer_resolves_notice};
use crate::github::registry::SharedRegistry;
use crate::paths;
use crate::slug;
use crate::tui::guide::Guide;
use crate::tui::keymap::send_prompt_to_pty;
use crate::tui::open_target;
use crate::tui::session_meta;
use crate::tui::startup::{comparison_label, fresh_llm_command, start_poller};
use crate::web;

use super::{App, REGENERATE_GUIDE_PROMPT};

impl App {
    /// Service a pending "Regenerate guide" request from the browser web shell.
    ///
    /// The shell server (a background thread) can't type into the LLM pane
    /// itself, so it flags the request and this, polled each event-loop tick,
    /// runs the same regeneration as `Ctrl+G`. A no-op when nothing is pending.
    pub fn poll_web_shell_requests(&mut self) {
        self.apply_pending_comparison_update();
        self.resolve_conflicts_if_asked();
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

    /// Type the "resolve these merge conflicts" request into the LLM pane when
    /// the reviewer chose auto-resolve in the browser's conflict modal.
    fn resolve_conflicts_if_asked(&mut self) {
        let Some(files) = self
            .comment_channels
            .github
            .session(|s| s.conflicts_for_llm.take())
        else {
            return;
        };
        let Some(llm) = self.llm.as_ref().filter(|p| p.is_alive()) else {
            self.difit.write_to_screen(
                "\r\n\x1b[31m[dif] Can't auto-resolve the merge conflicts: the LLM pane isn't running.\x1b[0m\r\n",
            );
            let notice = reviewer_resolves_notice(files.len());
            self.comment_channels
                .github
                .session(|s| s.notice = Some(notice));
            return;
        };
        self.difit.write_to_screen(
            "\r\n\x1b[36m↻ Asking the LLM to resolve the merge conflicts from the GitHub pull…\x1b[0m\r\n",
        );
        send_prompt_to_pty(llm, &resolve_prompt(&files), self.agent_kind);
        self.last_inject_at = Some(Instant::now());
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
        self.comment_channels.github = SharedRegistry::load(paths::github_sync_path(
            &self.repo_root,
            &branch_slug,
            &scope_slug,
        ));
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
        self.poller = Some(start_poller(
            &self.repo_root,
            &self.comparison,
            self.port,
            self.transcript_path.clone(),
            &self.comment_channels.github,
        ));
        self.reopen_web_shell();
    }

    /// Start a fresh web shell for the current review, record its URL in the
    /// session metadata, and open it in the browser. Falls back to difit's own
    /// URL when the shell cannot start.
    fn reopen_web_shell(&mut self) {
        self.web_shell = web::WebShell::start(
            self.port,
            self.shell_port,
            self.guide_json_path.clone(),
            self.branch.clone(),
            self.worktree.clone(),
            self.diff_summary_path.clone(),
            self.test_plan_path.clone(),
            self.comment_channels.clone(),
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
        open_target::open_url(&open_url);
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
            // as the original launch) and the open shell tab reloads itself.
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
        // The shell keeps serving on the same port, so the open tab reloads
        // itself once it sees the restart. Opening the URL again would only
        // stack up tabs (`Ctrl+O` is there when no tab is open).
        if let Some(shell) = self.web_shell.as_ref() {
            shell.note_difit_restart();
        }
    }
}
