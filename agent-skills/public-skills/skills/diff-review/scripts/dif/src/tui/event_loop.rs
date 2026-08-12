//! The main loop: draw, inject, then poll input on a 50ms cadence.
//!
//! Keystrokes route to the focused pane. The difit pane is read-only (scroll
//! keys only); the LLM pane receives full keyboard input. `Alt+H`/`Alt+L`
//! switch focus; `Ctrl+P` opens the command palette, `Ctrl+R` restarts the
//! difit server, `Ctrl+N` starts a fresh LLM session, and `Ctrl+Q` quits
//! (all intercepted globally, so they never reach the LLM).

use std::io::Stdout;
use std::time::Duration;

use anyhow::Result;
use crossterm::event::{
    self, Event, KeyCode, KeyEvent, KeyEventKind, KeyModifiers, MouseEventKind,
};
use ratatui::Terminal;
use ratatui::backend::CrosstermBackend;

use super::app::{App, Panel};
use super::draw::draw;
use super::keymap::key_to_bytes;

/// Rows scrolled per wheel notch / arrow press in the read-only difit pane.
const SCROLL_STEP: usize = 3;
/// Rows scrolled per page key.
const PAGE_STEP: usize = 20;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum AltScroll {
    LineUp,
    LineDown,
}

/// Run the TUI until the user quits or both panes die.
pub fn run_event_loop(
    terminal: &mut Terminal<CrosstermBackend<Stdout>>,
    app: &mut App,
) -> Result<()> {
    let poll = Duration::from_millis(50);
    loop {
        app.reap_llm();
        terminal.draw(|f| draw(f, app))?;
        app.inject_pending();
        app.poll_web_shell_requests();
        app.update_difit_log();
        if app.should_quit {
            break;
        }
        if !event::poll(poll)? {
            continue;
        }
        // Resize needs no handling: the next draw resizes both PTYs to fit.
        match event::read()? {
            Event::Mouse(me) => match me.kind {
                MouseEventKind::ScrollUp => app.scroll_focused_up(SCROLL_STEP),
                MouseEventKind::ScrollDown => app.scroll_focused_down(SCROLL_STEP),
                _ => {}
            },
            Event::Key(k) if matches!(k.kind, KeyEventKind::Press | KeyEventKind::Repeat) => {
                handle_key(app, &k);
            }
            _ => {}
        }
    }
    Ok(())
}

fn handle_key(app: &mut App, k: &KeyEvent) {
    // The start-review question is asked at launch and answered before anything
    // else, so it captures all keys while open.
    if app.start_review_open() {
        handle_start_review_key(app, k);
        return;
    }
    // The help modal is a read-only overlay: while open it captures all keys and
    // only closes.
    if app.help_open {
        handle_help_key(app, k);
        return;
    }
    // The palette is a modal overlay: while open it captures all keys.
    if app.palette_open() {
        handle_palette_key(app, k);
        return;
    }

    // Global commands intercepted before keys reach the focused pane. The
    // palette (Ctrl+P), restart (Ctrl+R), and quit (Ctrl+Q) work from either
    // pane; Alt+H / Alt+L switch focus. These Ctrl keys are not forwarded to
    // the LLM.
    let ctrl = k.modifiers.contains(KeyModifiers::CONTROL);
    if ctrl {
        match k.code {
            KeyCode::Char('p' | 'P') => {
                app.open_palette();
                return;
            }
            KeyCode::Char('r' | 'R') => {
                app.restart_difit();
                return;
            }
            KeyCode::Char('g' | 'G') => {
                app.regenerate_guide();
                return;
            }
            KeyCode::Char('o' | 'O') => {
                app.open_in_browser();
                return;
            }
            KeyCode::Char('n' | 'N') => {
                app.new_llm_session();
                return;
            }
            KeyCode::Char('q' | 'Q') => {
                app.quit();
                return;
            }
            _ => {}
        }
    }
    if k.modifiers.contains(KeyModifiers::ALT) {
        match k.code {
            KeyCode::Char('h' | 'H') => {
                app.focus_difit();
                return;
            }
            KeyCode::Char('l' | 'L') => {
                app.focus_llm();
                return;
            }
            KeyCode::Char('u' | 'U') => {
                app.scroll_focused_half_page(true);
                return;
            }
            KeyCode::Char('d' | 'D') => {
                app.scroll_focused_half_page(false);
                return;
            }
            // Alt+S opens the keyboard-shortcuts help modal.
            KeyCode::Char('s' | 'S') => {
                app.toggle_help();
                return;
            }
            _ => {
                if let Some(action) = alt_scroll_action(k) {
                    match action {
                        AltScroll::LineUp => app.scroll_focused_up(1),
                        AltScroll::LineDown => app.scroll_focused_down(1),
                    }
                    return;
                }
            }
        }
    }

    match app.focus {
        Panel::Difit => handle_difit_keys(app, k),
        Panel::Llm => forward_to_llm(app, k),
    }
}

const fn alt_scroll_action(k: &KeyEvent) -> Option<AltScroll> {
    if !k.modifiers.contains(KeyModifiers::ALT) {
        return None;
    }
    match k.code {
        KeyCode::Char('k' | 'K') => Some(AltScroll::LineUp),
        KeyCode::Char('j' | 'J') => Some(AltScroll::LineDown),
        _ => None,
    }
}

/// Drive the "no diff review found — start one?" modal.
///
/// `y` / `n` answer outright, `Enter` takes the selected button, `←`/`→` (and
/// `h`/`l`, `Tab`) move the selection, and `Esc` / `Ctrl+C` dismiss. Dismissing
/// starts nothing: the diff stays open exactly as it is. Every other key is
/// swallowed so a stray keystroke cannot leak into the LLM pane and read as an
/// answer.
fn handle_start_review_key(app: &mut App, k: &KeyEvent) {
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

/// What a keystroke means to the start-review modal. Pure, so the key map is
/// unit-tested without a terminal or a spawned pane.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum StartReviewKey {
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

const fn start_review_action(k: &KeyEvent) -> StartReviewKey {
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

/// Drive the open help modal: `Esc`, `Alt+S`, or `Ctrl+C` close it; every other
/// key is swallowed (the modal is read-only).
const fn handle_help_key(app: &mut App, k: &KeyEvent) {
    let ctrl = k.modifiers.contains(KeyModifiers::CONTROL);
    let alt = k.modifiers.contains(KeyModifiers::ALT);
    match k.code {
        KeyCode::Esc => app.close_help(),
        KeyCode::Char('c' | 'C') if ctrl => app.close_help(),
        KeyCode::Char('s' | 'S') if alt => app.close_help(),
        _ => {}
    }
}

/// Drive the open command palette. `Esc` / `Ctrl+C` close it, `Enter` runs the
/// selection, arrows (and `Ctrl+J` / `Ctrl+K`) navigate, and printable
/// characters filter. Mirrors the `tasks` palette key handler.
fn handle_palette_key(app: &mut App, k: &KeyEvent) {
    let ctrl = k.modifiers.contains(KeyModifiers::CONTROL);
    let Some(palette) = app.palette.as_mut() else {
        return;
    };
    match k.code {
        KeyCode::Esc => app.close_palette(),
        KeyCode::Char('c' | 'C') if ctrl => app.close_palette(),
        KeyCode::Enter => {
            if let Some(action) = palette.selected_action() {
                app.execute_palette_action(action);
            } else {
                app.close_palette();
            }
        }
        KeyCode::Up => palette.move_up(),
        KeyCode::Down => palette.move_down(),
        KeyCode::Char('j' | 'J') if ctrl => palette.move_down(),
        KeyCode::Char('k' | 'K') if ctrl => palette.move_up(),
        KeyCode::Backspace => palette.pop(),
        KeyCode::Char(c) if !ctrl => palette.append(c),
        _ => {}
    }
}

/// The main diff pane is read-only. `Tab` / `Shift+Tab` cycle between the log
/// and diff guide views (there are no bare-letter shortcuts to switch views).
/// In the **diff guide** view, bare letters drive a basic vim pager via the
/// [`vim`](super::vim) navigator (`jkhl`, `w`/`b`, `d`/`u`, `gg`/`G`, and `o` to
/// open the path/URL under the cursor). Arrows / `PageUp` / `PageDown` scroll in
/// either view. (Bare letters are safe here because the main pane never forwards
/// keystrokes to the LLM.)
fn handle_difit_keys(app: &mut App, k: &KeyEvent) {
    match k.code {
        KeyCode::Tab => app.cycle_main_view_next(),
        KeyCode::BackTab => app.cycle_main_view_prev(),
        KeyCode::Up => app.scroll_focused_up(SCROLL_STEP),
        KeyCode::Down => app.scroll_focused_down(SCROLL_STEP),
        KeyCode::PageUp => app.scroll_focused_up(PAGE_STEP),
        KeyCode::PageDown => app.scroll_focused_down(PAGE_STEP),
        KeyCode::Char(c) if app.markdown_view_active() => app.guide_vim_char(c),
        _ => {}
    }
}

/// Forward a keystroke to the live LLM pane, snapping it to the live tail.
fn forward_to_llm(app: &App, k: &KeyEvent) {
    let Some(llm) = app.llm.as_ref() else {
        return;
    };
    if let Some(bytes) = key_to_bytes(k) {
        llm.scroll_to_bottom();
        llm.send(bytes);
    }
}

#[cfg(test)]
mod tests {
    use crossterm::event::{KeyCode, KeyEvent, KeyModifiers};

    use super::{AltScroll, StartReviewKey, alt_scroll_action, start_review_action};

    fn alt_key(c: char) -> KeyEvent {
        KeyEvent::new(KeyCode::Char(c), KeyModifiers::ALT)
    }

    fn plain_key(c: char) -> KeyEvent {
        KeyEvent::new(KeyCode::Char(c), KeyModifiers::NONE)
    }

    #[test]
    fn alt_j_and_alt_k_are_single_line_scrolls() {
        assert_eq!(alt_scroll_action(&alt_key('j')), Some(AltScroll::LineDown));
        assert_eq!(alt_scroll_action(&alt_key('J')), Some(AltScroll::LineDown));
        assert_eq!(alt_scroll_action(&alt_key('k')), Some(AltScroll::LineUp));
        assert_eq!(alt_scroll_action(&alt_key('K')), Some(AltScroll::LineUp));
    }

    #[test]
    fn bare_j_and_k_are_not_global_scrolls() {
        assert_eq!(alt_scroll_action(&plain_key('j')), None);
        assert_eq!(alt_scroll_action(&plain_key('k')), None);
    }

    fn bare(code: KeyCode) -> KeyEvent {
        KeyEvent::new(code, KeyModifiers::NONE)
    }

    #[test]
    fn y_and_n_answer_the_start_review_modal_outright() {
        assert_eq!(
            start_review_action(&plain_key('y')),
            StartReviewKey::Accept
        );
        assert_eq!(
            start_review_action(&plain_key('Y')),
            StartReviewKey::Accept
        );
        assert_eq!(
            start_review_action(&plain_key('n')),
            StartReviewKey::Dismiss
        );
        assert_eq!(
            start_review_action(&plain_key('N')),
            StartReviewKey::Dismiss
        );
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
        // Notably including a stray Ctrl chord and ordinary typing: while the
        // modal is open the only thing it can do is answer the question.
        assert_eq!(
            start_review_action(&plain_key('q')),
            StartReviewKey::Ignore
        );
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
