//! The [`App`] surface that drives the start-review modal.
//!
//! Kept out of `app.rs` so that module stays state plus its existing behaviours:
//! this file owns everything about answering the "start a review?" question.

use std::time::Instant;

use super::modal::Outcome;
use crate::tui::app::App;
use crate::tui::keymap::send_prompt_to_pty;
use crate::tui::startup::fresh_llm_command_with_prompt;

impl App {
    /// Whether the start-review modal is open.
    #[must_use]
    pub const fn start_review_open(&self) -> bool {
        self.start_review.is_some()
    }

    /// Move the start-review modal's selection to the other button.
    pub const fn toggle_start_review_choice(&mut self) {
        if let Some(modal) = self.start_review.as_mut() {
            modal.toggle();
        }
    }

    /// Select Yes in the start-review modal without answering yet.
    pub const fn select_start_review_yes(&mut self) {
        if let Some(modal) = self.start_review.as_mut() {
            modal.select_yes();
        }
    }

    /// Select No in the start-review modal without answering yet.
    pub const fn select_start_review_no(&mut self) {
        if let Some(modal) = self.start_review.as_mut() {
            modal.select_no();
        }
    }

    /// Answer the start-review modal on its current selection (`Enter`).
    pub fn confirm_start_review(&mut self) {
        let Some(modal) = self.start_review.as_ref() else {
            return;
        };
        self.resolve_start_review(modal.confirm());
    }

    /// Answer the start-review modal Yes outright (the `y` key).
    pub fn accept_start_review(&mut self) {
        let Some(modal) = self.start_review.as_ref() else {
            return;
        };
        self.resolve_start_review(modal.accept());
    }

    /// Dismiss the start-review modal, doing nothing else (`n`, `Esc`).
    pub fn dismiss_start_review(&mut self) {
        self.start_review = None;
    }

    /// Close the modal and carry out its outcome.
    ///
    /// A Yes types `/diff-review [comparison]` into the LLM pane, which is the
    /// one and only way this tool ever starts generating a review. If the pane
    /// has since died, it is respawned on a fresh session seeded with that same
    /// command, so the answer is honored either way.
    fn resolve_start_review(&mut self, outcome: Outcome) {
        self.start_review = None;
        let Outcome::StartReview(prompt) = outcome else {
            return;
        };
        if let Some(llm) = self.llm.as_ref().filter(|pane| pane.is_alive()) {
            llm.write_to_screen("\r\n\x1b[36m[dif] Starting a diff review...\x1b[0m\r\n");
            send_prompt_to_pty(llm, &prompt, self.agent_kind);
            self.last_inject_at = Some(Instant::now());
        } else {
            self.respawn_llm_with_prompt(&prompt);
        }
    }

    /// Respawn the LLM pane on a fresh session seeded with `prompt`.
    ///
    /// The pane guard comes first on purpose: minting the command persists a new
    /// session id, so building it before knowing there is a pane to respawn
    /// would overwrite the saved id with one no process ever uses, and silently
    /// drop the reviewer's Yes. With no pane at all there is nothing to do but
    /// say so in the difit log, which is the only surface left.
    fn respawn_llm_with_prompt(&mut self, prompt: &str) {
        if self.llm.is_none() {
            self.difit.write_to_screen(
                "\r\n\x1b[31m[dif] No LLM pane is running, so the review could not be \
                 started. Restart dif to get one.\x1b[0m\r\n",
            );
            return;
        }
        let command = fresh_llm_command_with_prompt(
            &self.repo_root,
            &self.session_id_path,
            self.agent_kind,
            &self.llm_cmd,
            Some(prompt),
        );
        let Some(llm) = self.llm.as_mut() else {
            return;
        };
        if let Err(e) = llm.respawn_shell_command_with_env(&command, &[], &self.repo_root) {
            llm.write_to_screen(&format!(
                "\x1b[31m[dif] Failed to start the review session: {e}\x1b[0m\r\n"
            ));
        } else {
            self.last_inject_at = Some(Instant::now());
        }
    }
}
