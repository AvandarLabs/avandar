//! The difit log, session metadata, and the LLM pane: liveness, code-change
//! warnings, and typing reviewer comments into it.

use std::time::Instant;

use crate::difit::poller::Poller;
use crate::inject::dispatcher::Delivery;
use crate::pty_pane::PtyPane;
use crate::tui::change_alert::{change_alert_for, change_author};
use crate::tui::keymap::send_prompt_to_pty;
use crate::tui::session_meta::{self, SessionMeta};
use crate::tui::startup::review_files_ready;

use super::{App, CODE_CHANGE_SETTLE, LLM_ATTRIBUTION_WINDOW};

impl App {
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

    /// Type newly-open reviewer comments into the LLM pane: each one at once in
    /// eager mode, or all held ones together when the browser asks to "Send
    /// all" in bulk mode (a comment marked "send now" goes at once even then).
    /// PR-bound comments are never typed. Checks the pane is
    /// alive *before* consuming snapshots (or a send-all request) so a dispatch
    /// is never lost to a dead pane.
    pub fn inject_pending(&mut self) {
        let Some(llm) = self.llm.as_ref().filter(|p| p.is_alive()) else {
            return;
        };
        let Some(snapshot) = self.poller.as_ref().and_then(Poller::latest) else {
            return;
        };
        let delivery = self.comment_channels.dispatch.take_delivery();
        self.dispatcher
            .send_now(self.comment_channels.dispatch.take_send_now());
        let excluded = self.comment_channels.github.github_ids();
        let outcome = self
            .dispatcher
            .next_dispatch(&snapshot, &excluded, delivery);
        self.comment_channels.dispatch.set_queued(outcome.queued);
        let prompts = outcome.prompts;
        if !prompts.is_empty() {
            self.last_inject_at = Some(Instant::now());
        }
        if delivery == Delivery::SendAll && !prompts.is_empty() {
            self.difit.write_to_screen(
                "\r\n\x1b[36m↪ Sending held review comments to the LLM (requested from the browser)…\x1b[0m\r\n",
            );
        }
        for prompt in prompts {
            send_prompt_to_pty(llm, &prompt, self.agent_kind);
        }
    }
}
