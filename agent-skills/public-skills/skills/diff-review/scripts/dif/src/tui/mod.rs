//! The terminal UI: a two-pane shell (difit log + LLM) with live comment
//! injection. [`run`] owns terminal setup/teardown around the event loop.

pub mod app;
pub mod change_alert;
pub mod control;
pub mod draw;
pub mod draw_help;
pub mod draw_palette;
pub mod event_loop;
pub mod guide;
pub mod keymap;
pub mod main_diff_view;
pub mod modal_layout;
pub mod mouse;
pub mod markdown;
pub mod open_target;
pub mod palette;
pub mod selection;
pub mod session_meta;
pub mod shortcuts;
pub mod start_review;
pub mod startup;
pub mod vim;

use std::io::{Stdout, Write, stdout};

use anyhow::{Context, Result};
use crossterm::event::DisableMouseCapture;
use crossterm::execute;
use crossterm::terminal::{
    EnterAlternateScreen, LeaveAlternateScreen, disable_raw_mode, enable_raw_mode,
};
use ratatui::Terminal;
use ratatui::backend::CrosstermBackend;

use crate::cli::Cli;

use event_loop::run_event_loop;

/// Launch the review and run the TUI to completion.
///
/// difit, the LLM session, and the poller are all torn down when the
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
    execute!(out, EnterAlternateScreen).context("entering alternate screen")?;
    out.write_all(mouse::ENABLE_MOUSE_REPORTING)
        .and_then(|()| out.flush())
        .context("enabling mouse reporting")?;
    Terminal::new(CrosstermBackend::new(out)).context("creating terminal")
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
