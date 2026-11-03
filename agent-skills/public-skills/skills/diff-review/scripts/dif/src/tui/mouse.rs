//! Mouse input: the wheel scrolls the pane under the pointer, a click focuses a
//! pane, and a left-button drag selects text that is copied on release.
//!
//! The terminal reports button presses, drags, and the wheel (DECSET 1000 +
//! 1002, SGR-encoded via 1006). Bare pointer motion (1003) stays off, so hover
//! never floods the loop and iTerm2 keeps its own ⌘-hover link handling.

use crossterm::event::{MouseButton, MouseEvent, MouseEventKind};
use ratatui::layout::Rect;

use super::app::{App, Panel};

/// Rows scrolled per wheel notch.
pub const WHEEL_STEP: usize = 3;

/// The terminal modes `dif` turns on for mouse input.
///
/// Button presses (1000), drags while a button is held (1002), and SGR
/// coordinates (1006). Set in this order: iTerm2 keeps 1000/1002/1003 in one
/// slot, so the last one set wins.
pub const ENABLE_MOUSE_REPORTING: &[u8] = b"\x1b[?1000h\x1b[?1002h\x1b[?1006h";

/// The content rectangles of the two panes, recorded by the last draw so mouse
/// events can be mapped onto them.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
pub struct PaneAreas {
    /// The main pane's active view, below its tab strip.
    pub main: Rect,
    /// The LLM pane's terminal, inside its border.
    pub llm: Rect,
}

impl PaneAreas {
    /// The content rectangle of `panel`.
    #[must_use]
    pub const fn of(&self, panel: Panel) -> Rect {
        match panel {
            Panel::Difit => self.main,
            Panel::Llm => self.llm,
        }
    }

    /// The pane whose content contains the cell `(column, row)`, if any.
    #[must_use]
    pub fn panel_at(&self, column: u16, row: u16) -> Option<Panel> {
        [Panel::Difit, Panel::Llm]
            .into_iter()
            .find(|panel| contains(self.of(*panel), column, row))
    }
}

/// Which way a drag has left a pane vertically, so the pane can scroll to
/// follow it.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Overshoot {
    /// The pointer is above the pane.
    Above,
    /// The pointer is below the pane.
    Below,
}

/// The pane-relative `(row, col)` nearest to the terminal cell
/// `(column, row)`, clamped into `area`, plus whether the pointer is above or
/// below it. `None` for an empty area.
#[must_use]
pub fn clamp_into(area: Rect, column: u16, row: u16) -> Option<((u16, u16), Option<Overshoot>)> {
    if area.is_empty() {
        return None;
    }
    let overshoot = if row < area.y {
        Some(Overshoot::Above)
    } else if row >= area.bottom() {
        Some(Overshoot::Below)
    } else {
        None
    };
    let r = row.clamp(area.y, area.bottom() - 1) - area.y;
    let c = column.clamp(area.x, area.right() - 1) - area.x;
    Some(((r, c), overshoot))
}

const fn contains(area: Rect, column: u16, row: u16) -> bool {
    column >= area.x && column < area.x + area.width && row >= area.y && row < area.y + area.height
}

/// Route one mouse event. Ignored while a modal (palette, help, start-review)
/// is open, since those are keyboard-driven and sit over both panes.
pub fn handle_mouse(app: &mut App, event: MouseEvent) {
    if app.modal_open() {
        return;
    }
    let (column, row) = (event.column, event.row);
    match event.kind {
        MouseEventKind::ScrollUp => {
            if let Some(panel) = app.pane_areas.panel_at(column, row) {
                app.scroll_panel_up(panel, WHEEL_STEP);
            }
        }
        MouseEventKind::ScrollDown => {
            if let Some(panel) = app.pane_areas.panel_at(column, row) {
                app.scroll_panel_down(panel, WHEEL_STEP);
            }
        }
        MouseEventKind::Down(MouseButton::Left) => app.begin_selection(column, row),
        MouseEventKind::Drag(MouseButton::Left) => app.extend_selection(column, row),
        MouseEventKind::Up(MouseButton::Left) => app.finish_selection(),
        _ => {}
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn areas() -> PaneAreas {
        PaneAreas {
            main: Rect::new(1, 2, 38, 20),
            llm: Rect::new(41, 1, 38, 21),
        }
    }

    #[test]
    fn panel_at_maps_a_cell_to_the_pane_whose_content_holds_it() {
        assert_eq!(areas().panel_at(1, 2), Some(Panel::Difit));
        assert_eq!(areas().panel_at(38, 21), Some(Panel::Difit));
        assert_eq!(areas().panel_at(41, 1), Some(Panel::Llm));
        assert_eq!(areas().panel_at(78, 21), Some(Panel::Llm));
    }

    #[test]
    fn panel_at_ignores_borders_the_tab_strip_and_the_statusline() {
        assert_eq!(areas().panel_at(0, 5), None, "left border");
        assert_eq!(areas().panel_at(5, 1), None, "main tab strip");
        assert_eq!(areas().panel_at(39, 5), None, "between the panes");
        assert_eq!(areas().panel_at(50, 23), None, "statusline");
    }

    #[test]
    fn clamp_into_gives_pane_relative_cells_inside_the_pane() {
        let area = Rect::new(10, 5, 20, 8);
        assert_eq!(clamp_into(area, 10, 5), Some(((0, 0), None)));
        assert_eq!(clamp_into(area, 29, 12), Some(((7, 19), None)));
    }

    #[test]
    fn clamp_into_pins_an_overshooting_drag_to_the_nearest_edge() {
        let area = Rect::new(10, 5, 20, 8);
        assert_eq!(
            clamp_into(area, 3, 2),
            Some(((0, 0), Some(Overshoot::Above)))
        );
        assert_eq!(
            clamp_into(area, 60, 20),
            Some(((7, 19), Some(Overshoot::Below)))
        );
        assert_eq!(clamp_into(area, 60, 6), Some(((1, 19), None)));
    }

    #[test]
    fn clamp_into_rejects_an_empty_area() {
        assert_eq!(clamp_into(Rect::new(4, 4, 0, 3), 4, 4), None);
    }

    #[test]
    fn mouse_reporting_enables_presses_drags_and_sgr_but_not_bare_motion() {
        let modes = String::from_utf8_lossy(ENABLE_MOUSE_REPORTING);
        assert_eq!(modes, "\x1b[?1000h\x1b[?1002h\x1b[?1006h");
        assert!(!modes.contains("1003"), "hover reporting stays off");
        assert!(!modes.contains('l'), "never resets a mode it needs");
    }
}
