//! The main loop: draw, inject, then poll input on a 50ms cadence.
//!
//! Keystrokes route to the focused pane. The difit pane is read-only (scroll
//! keys only); the claude pane receives full keyboard input. `Alt+H`/`Alt+L`
//! switch focus; `Ctrl+P` opens the command palette, `Ctrl+R` restarts the
//! difit server, and `Ctrl+Q` quits (all intercepted globally, so they never
//! reach claude).

use std::io::Stdout;
use std::time::Duration;

use anyhow::Result;
use crossterm::event::{self, Event, KeyCode, KeyEvent, KeyEventKind, KeyModifiers, MouseEventKind};
use ratatui::Terminal;
use ratatui::backend::CrosstermBackend;

use super::app::{App, Panel};
use super::draw::draw;
use super::keymap::key_to_bytes;

/// Rows scrolled per wheel notch / arrow press in the read-only difit pane.
const SCROLL_STEP: usize = 3;
/// Rows scrolled per page key.
const PAGE_STEP: usize = 20;

/// Run the TUI until the user quits or both panes die.
pub fn run_event_loop(terminal: &mut Terminal<CrosstermBackend<Stdout>>, app: &mut App) -> Result<()> {
    let poll = Duration::from_millis(50);
    loop {
        app.reap_claude();
        terminal.draw(|f| draw(f, app))?;
        app.inject_pending();
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
    // The palette is a modal overlay: while open it captures all keys.
    if app.palette_open() {
        handle_palette_key(app, k);
        return;
    }

    // Global commands intercepted before keys reach the focused pane. The
    // palette (Ctrl+P), restart (Ctrl+R), and quit (Ctrl+Q) work from either
    // pane; Alt+H / Alt+L switch focus. These Ctrl keys are not forwarded to
    // claude.
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
            KeyCode::Char('d' | 'D') => {
                app.regenerate_guide();
                return;
            }
            KeyCode::Char('o' | 'O') => {
                app.open_in_browser();
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
                app.focus_claude();
                return;
            }
            // Alt+U / Alt+D scroll the focused view a half-page up / down.
            // Intercepted here (before keys reach Claude) so they fire even
            // while the Claude pane is focused.
            KeyCode::Char('u' | 'U') => {
                app.scroll_focused_half_page(true);
                return;
            }
            KeyCode::Char('d' | 'D') => {
                app.scroll_focused_half_page(false);
                return;
            }
            _ => {}
        }
    }

    match app.focus {
        Panel::Difit => handle_difit_keys(app, k),
        Panel::Claude => forward_to_claude(app, k),
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
/// keystrokes to claude.)
fn handle_difit_keys(app: &mut App, k: &KeyEvent) {
    match k.code {
        KeyCode::Tab => app.cycle_main_view_next(),
        KeyCode::BackTab => app.cycle_main_view_prev(),
        KeyCode::Up => app.scroll_focused_up(SCROLL_STEP),
        KeyCode::Down => app.scroll_focused_down(SCROLL_STEP),
        KeyCode::PageUp => app.scroll_focused_up(PAGE_STEP),
        KeyCode::PageDown => app.scroll_focused_down(PAGE_STEP),
        KeyCode::Char(c) if app.guide_view_active() => app.guide_vim_char(c),
        _ => {}
    }
}

/// Forward a keystroke to the live claude pane, snapping it to the live tail.
fn forward_to_claude(app: &App, k: &KeyEvent) {
    let Some(claude) = app.claude.as_ref() else {
        return;
    };
    if let Some(bytes) = key_to_bytes(k) {
        claude.scroll_to_bottom();
        claude.send(bytes);
    }
}
