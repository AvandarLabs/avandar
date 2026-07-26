//! The terminal UI: a two-pane shell (difit log + claude) with live comment
//! injection. [`run`] owns terminal setup/teardown around the event loop.

pub mod app;
pub mod change_alert;
pub mod draw;
pub mod draw_help;
pub mod draw_palette;
pub mod event_loop;
pub mod guide;
pub mod keymap;
pub mod main_diff_view;
pub mod markdown;
pub mod open_target;
pub mod palette;
pub mod session_meta;
pub mod shortcuts;
pub mod startup;
pub mod vim;

use std::io::{Stdout, stdout};

use anyhow::{Context, Result};
use crossterm::event::{DisableMouseCapture, EnableMouseCapture};
use crossterm::terminal::{
    EnterAlternateScreen, LeaveAlternateScreen, disable_raw_mode, enable_raw_mode,
};
use crossterm::execute;
use ratatui::Terminal;
use ratatui::backend::CrosstermBackend;

use crate::cli::Cli;

use event_loop::run_event_loop;

/// Launch the review and run the TUI to completion.
///
/// difit, the claude session, and the poller are all torn down when the
/// returned [`App`](app::App) drops at the end of this function.
pub fn run(cli: &Cli) -> Result<()> {
    let mut app = startup::launch(cli)?;
    let mut terminal = setup_terminal()?;
    let result = run_event_loop(&mut terminal, &mut app);
    let restore = restore_terminal(&mut terminal);
    session_meta::remove(&app.session_meta);
    result.and(restore)
}

fn setup_terminal() -> Result<Terminal<CrosstermBackend<Stdout>>> {
    enable_raw_mode().context("enabling raw mode")?;
    let mut out = stdout();
    execute!(out, EnterAlternateScreen, EnableMouseCapture).context("entering alternate screen")?;
    disable_mouse_motion_reporting(&mut out);
    Terminal::new(CrosstermBackend::new(out)).context("creating terminal")
}

/// Turn off mouse *motion* reporting (DECSET 1002 button-drag + 1003 any-event)
/// that `EnableMouseCapture` also enables, keeping only button + wheel
/// reporting. With motion reporting on, iTerm2 won't let ⌘-hover / ⌘-click reach
/// its native link / Semantic-History handler; with only button + wheel, holding
/// ⌘ bypasses to native links while we still capture the scroll wheel.
/// Best-effort: a write failure just leaves the default capture in place.
fn disable_mouse_motion_reporting<W: std::io::Write>(w: &mut W) {
    let _ = w.write_all(b"\x1b[?1002l\x1b[?1003l");
    let _ = w.flush();
}

fn restore_terminal(terminal: &mut Terminal<CrosstermBackend<Stdout>>) -> Result<()> {
    disable_raw_mode().context("disabling raw mode")?;
    execute!(
        terminal.backend_mut(),
        LeaveAlternateScreen,
        DisableMouseCapture
    )
    .context("leaving alternate screen")?;
    terminal.show_cursor().context("showing cursor")?;
    Ok(())
}
