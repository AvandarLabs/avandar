//! Key handling for the start-review modal.
//!
//! The modal is asked at launch and captures every key while open, so a stray
//! keystroke can neither leak into the LLM pane nor read as an answer. The
//! key-to-intent mapping is a pure function so the whole key map is
//! unit-testable without a terminal or a spawned pane.

use crossterm::event::{KeyCode, KeyEvent, KeyModifiers};

use crate::tui::app::App;

/// What a keystroke means to the start-review modal.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum StartReviewKey {
    /// Answer Yes outright.
    Accept,
    /// Answer No: close and do nothing.
    Dismiss,
    /// Answer with whichever button is selected.
    Confirm,
    /// Move the selection to Yes without answering.
    SelectYes,
    /// Move the selection to No without answering.
    SelectNo,
    /// Move the selection to the other button.
    Toggle,
    /// Swallowed, so it cannot leak into the LLM pane.
    Ignore,
}

/// Apply a keystroke to the open start-review modal.
pub fn handle_start_review_key(app: &mut App, k: &KeyEvent) {
    match start_review_action(k) {
        StartReviewKey::Accept => app.accept_start_review(),
        StartReviewKey::Dismiss => app.dismiss_start_review(),
        StartReviewKey::Confirm => app.confirm_start_review(),
        StartReviewKey::SelectYes => app.select_start_review_yes(),
        StartReviewKey::SelectNo => app.select_start_review_no(),
        StartReviewKey::Toggle => app.toggle_start_review_choice(),
        StartReviewKey::Ignore => {}
    }
}

/// The intent a keystroke carries while the modal is open.
#[must_use]
pub const fn start_review_action(k: &KeyEvent) -> StartReviewKey {
    if k.modifiers.contains(KeyModifiers::CONTROL) {
        return match k.code {
            KeyCode::Char('c' | 'C') => StartReviewKey::Dismiss,
            _ => StartReviewKey::Ignore,
        };
    }
    match k.code {
        KeyCode::Char('y' | 'Y') => StartReviewKey::Accept,
        KeyCode::Esc | KeyCode::Char('n' | 'N') => StartReviewKey::Dismiss,
        KeyCode::Enter => StartReviewKey::Confirm,
        KeyCode::Left | KeyCode::Char('h' | 'H') => StartReviewKey::SelectNo,
        KeyCode::Right | KeyCode::Char('l' | 'L') => StartReviewKey::SelectYes,
        KeyCode::Tab | KeyCode::BackTab => StartReviewKey::Toggle,
        _ => StartReviewKey::Ignore,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn plain_key(c: char) -> KeyEvent {
        KeyEvent::new(KeyCode::Char(c), KeyModifiers::NONE)
    }

    fn bare(code: KeyCode) -> KeyEvent {
        KeyEvent::new(code, KeyModifiers::NONE)
    }

    #[test]
    fn y_and_n_answer_the_modal_outright() {
        assert_eq!(start_review_action(&plain_key('y')), StartReviewKey::Accept);
        assert_eq!(start_review_action(&plain_key('Y')), StartReviewKey::Accept);
        assert_eq!(start_review_action(&plain_key('n')), StartReviewKey::Dismiss);
        assert_eq!(start_review_action(&plain_key('N')), StartReviewKey::Dismiss);
    }

    #[test]
    fn esc_and_ctrl_c_dismiss_without_starting_a_review() {
        assert_eq!(
            start_review_action(&bare(KeyCode::Esc)),
            StartReviewKey::Dismiss
        );
        assert_eq!(
            start_review_action(&KeyEvent::new(KeyCode::Char('c'), KeyModifiers::CONTROL)),
            StartReviewKey::Dismiss
        );
    }

    #[test]
    fn arrows_move_the_selection_and_enter_answers_it() {
        assert_eq!(
            start_review_action(&bare(KeyCode::Left)),
            StartReviewKey::SelectNo
        );
        assert_eq!(
            start_review_action(&bare(KeyCode::Right)),
            StartReviewKey::SelectYes
        );
        assert_eq!(
            start_review_action(&bare(KeyCode::Tab)),
            StartReviewKey::Toggle
        );
        assert_eq!(
            start_review_action(&bare(KeyCode::Enter)),
            StartReviewKey::Confirm
        );
    }

    #[test]
    fn other_keys_are_swallowed_so_they_cannot_reach_the_llm() {
        // Including a stray Ctrl chord and ordinary typing: while the modal is
        // open the only thing a key can do is answer the question.
        assert_eq!(start_review_action(&plain_key('q')), StartReviewKey::Ignore);
        assert_eq!(
            start_review_action(&KeyEvent::new(KeyCode::Char('r'), KeyModifiers::CONTROL)),
            StartReviewKey::Ignore
        );
        assert_eq!(
            start_review_action(&bare(KeyCode::Backspace)),
            StartReviewKey::Ignore
        );
    }
}
