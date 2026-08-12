//! State and wording for the launch-time "no diff review found, start one?"
//! modal.
//!
//! `dif` never generates a review on its own. Launching only ever shows the
//! diff: difit, the browser shell, and the poller come up immediately, and the
//! LLM pane opens idle with nothing typed into it. When no prepared review
//! exists for the comparison, this modal asks whether to start one, and *only*
//! an explicit Yes injects the `/diff-review [comparison]` command. Declining
//! closes the modal and leaves the diff exactly as it is.
//!
//! The state here is pure (a choice plus the prompt to inject) so the whole
//! decision is unit-testable without a terminal. Rendering lives in
//! [`draw`](super::draw) and key handling in [`keys`](super::keys).

/// Which button the modal has selected.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Choice {
    /// Start the review: inject the prepare command.
    Yes,
    /// Do nothing: close the modal and keep browsing the diff.
    No,
}

/// What the caller should do once the modal resolves.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Outcome {
    /// Inject this prompt into the LLM pane, then close.
    StartReview(String),
    /// Close and do nothing at all.
    Dismiss,
}

/// The open modal: the prompt a Yes would run, plus the current selection.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct StartReviewModal {
    prompt: String,
    comparison_label: String,
    choice: Choice,
}

impl StartReviewModal {
    /// Open the modal for `comparison_label`, offering to run `prompt`.
    ///
    /// Starts on [`Choice::Yes`]: the reviewer opened `dif` to review
    /// something, so it is the answer they most often want, and No is one
    /// keystroke away (`n`, `Esc`, or `left`).
    #[must_use]
    pub const fn new(prompt: String, comparison_label: String) -> Self {
        Self {
            prompt,
            comparison_label,
            choice: Choice::Yes,
        }
    }

    /// The currently selected button.
    #[must_use]
    pub const fn choice(&self) -> Choice {
        self.choice
    }

    /// The comparison this review would cover, e.g. `@ develop`.
    #[must_use]
    pub fn comparison_label(&self) -> &str {
        &self.comparison_label
    }

    /// Select Yes (`right`, `l`).
    pub const fn select_yes(&mut self) {
        self.choice = Choice::Yes;
    }

    /// Select No (`left`, `h`).
    pub const fn select_no(&mut self) {
        self.choice = Choice::No;
    }

    /// Move the selection to the other button (`Tab`).
    pub const fn toggle(&mut self) {
        self.choice = match self.choice {
            Choice::Yes => Choice::No,
            Choice::No => Choice::Yes,
        };
    }

    /// Resolve the modal on the current selection (`Enter`).
    #[must_use]
    pub fn confirm(&self) -> Outcome {
        match self.choice {
            Choice::Yes => Outcome::StartReview(self.prompt.clone()),
            Choice::No => Outcome::Dismiss,
        }
    }

    /// Resolve as an explicit Yes, whatever is selected (the `y` key).
    #[must_use]
    pub fn accept(&self) -> Outcome {
        Outcome::StartReview(self.prompt.clone())
    }
}

/// The modal's title.
#[must_use]
pub const fn title() -> &'static str {
    "No diff review found"
}

/// The modal's body paragraphs, in display order.
///
/// States what is missing, what is already usable without it, and what a Yes
/// would do, so declining is an informed choice rather than a shot in the dark.
/// The renderer wraps these to the modal width, so they are written as whole
/// sentences rather than pre-wrapped lines.
#[must_use]
pub fn body_lines(comparison_label: &str) -> Vec<String> {
    vec![
        format!("No prepared diff review exists for {comparison_label}."),
        String::new(),
        "The diff is already live in your browser, and any comment you leave is \
         saved and queued to the LLM either way."
            .to_owned(),
        String::new(),
        "Start a diff review now? Yes runs /diff-review in the LLM pane; No just \
         closes this and changes nothing."
            .to_owned(),
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    fn modal() -> StartReviewModal {
        StartReviewModal::new("/diff-review develop".to_owned(), "@ develop".to_owned())
    }

    #[test]
    fn confirming_the_opening_selection_starts_the_review() {
        // Also pins the opening selection: a modal that opened on No would
        // dismiss here instead.
        assert_eq!(
            modal().confirm(),
            Outcome::StartReview("/diff-review develop".to_owned())
        );
    }

    #[test]
    fn confirming_no_dismisses_without_a_prompt() {
        let mut start_review_modal = modal();
        start_review_modal.select_no();

        assert_eq!(start_review_modal.confirm(), Outcome::Dismiss);
    }

    #[test]
    fn toggle_moves_between_the_two_buttons() {
        let mut start_review_modal = modal();

        start_review_modal.toggle();
        assert_eq!(start_review_modal.choice(), Choice::No);
        start_review_modal.toggle();
        assert_eq!(start_review_modal.choice(), Choice::Yes);
    }

    #[test]
    fn accept_starts_the_review_even_when_no_is_selected() {
        let mut start_review_modal = modal();
        start_review_modal.select_no();

        // `y` is an explicit answer, not a cursor move.
        assert_eq!(
            start_review_modal.accept(),
            Outcome::StartReview("/diff-review develop".to_owned())
        );
    }

    #[test]
    fn body_names_the_comparison_and_both_answers() {
        let text = body_lines("@ develop").join(" ");

        assert!(text.contains("@ develop"), "names the comparison");
        assert!(text.contains("/diff-review"), "says what Yes runs");
        assert!(text.contains("changes nothing"), "says what No does");
        // The diff being usable regardless is the reason declining is safe.
        assert!(text.contains("already live"));
    }
}
