//! Drag-to-copy text selection over the panes. The selection model and text
//! extraction live in [`crate::tui::selection`]; this maps mouse cells onto
//! the pane under them and copies on release.

use std::time::Instant;

use crate::clipboard;
use crate::tui::mouse::{Overshoot, clamp_into};
use crate::tui::selection::{self, ContentOrigin, Selection};

use super::{App, Panel};

impl App {
    /// Whether a keyboard-driven modal (start-review, help, palette) is open.
    #[must_use]
    pub const fn modal_open(&self) -> bool {
        self.start_review.is_some() || self.help_open || self.palette.is_some()
    }

    /// How `panel`'s viewport maps onto its content right now.
    #[must_use]
    pub fn content_origin(&self, panel: Panel) -> Option<ContentOrigin> {
        if self.markdown_view_for(panel) {
            let (line, col) = self.active_markdown_ref().scroll();
            return Some(ContentOrigin {
                line_shift: i64::from(line),
                col_shift: col,
            });
        }
        let pane = self.pane_for(panel)?;
        let offset = pane.parser.read().ok()?.screen().scrollback();
        Some(ContentOrigin {
            line_shift: -i64::try_from(offset).ok()?,
            col_shift: 0,
        })
    }

    /// The selection to paint and its pane's origin, unless the main pane has
    /// since switched to a view the selection was not made in.
    #[must_use]
    pub fn selection_origin(&self) -> Option<(Selection, ContentOrigin)> {
        let sel = self.selection?;
        if sel.panel == Panel::Difit && sel.view != self.active_diff_view {
            return None;
        }
        Some((sel, self.content_origin(sel.panel)?))
    }

    /// A left-button press: focus the pane under the pointer and start a
    /// selection there. A press outside both panes just clears the selection.
    pub fn begin_selection(&mut self, column: u16, row: u16) {
        self.selection = None;
        let Some(panel) = self.pane_areas.panel_at(column, row) else {
            return;
        };
        self.focus = panel;
        let Some(((r, c), _)) = clamp_into(self.pane_areas.of(panel), column, row) else {
            return;
        };
        if let Some(origin) = self.content_origin(panel) {
            let point = origin.point_at(r, c);
            self.selection = Some(Selection::start(panel, self.active_diff_view, point));
        }
    }

    /// A drag with the left button held: move the selection's head. Dragging
    /// past the top or bottom of a terminal pane scrolls it one row, so a
    /// selection can reach text that is out of view.
    pub fn extend_selection(&mut self, column: u16, row: u16) {
        let Some(sel) = self.selection else {
            return;
        };
        let Some(((r, c), overshoot)) = clamp_into(self.pane_areas.of(sel.panel), column, row)
        else {
            return;
        };
        if !self.markdown_view_for(sel.panel) {
            match overshoot {
                Some(Overshoot::Above) => self.scroll_panel_up(sel.panel, 1),
                Some(Overshoot::Below) => self.scroll_panel_down(sel.panel, 1),
                None => {}
            }
        }
        if let Some(origin) = self.content_origin(sel.panel) {
            self.selection = Some(Selection {
                head: origin.point_at(r, c),
                ..sel
            });
        }
    }

    /// The left button came up: copy a dragged selection to the clipboard and
    /// keep it highlighted. A plain click leaves nothing selected.
    pub fn finish_selection(&mut self) {
        let Some(sel) = self.selection else {
            return;
        };
        if sel.is_click() {
            self.selection = None;
            return;
        }
        let text = self.selected_text(&sel);
        if text.is_empty() {
            return;
        }
        let notice = match clipboard::copy(&text) {
            Ok(()) => format!("Copied {} characters", text.chars().count()),
            Err(e) => format!("Copy failed: {e:#}"),
        };
        self.notice = Some((notice, Instant::now()));
    }

    /// Drop the selection (a key press or resize).
    pub const fn clear_selection(&mut self) {
        self.selection = None;
    }

    fn selected_text(&self, sel: &Selection) -> String {
        let (start, end) = sel.ordered();
        if self.markdown_view_for(sel.panel) {
            return selection::lines_text(self.active_markdown_ref().lines(), start, end);
        }
        self.pane_for(sel.panel)
            .and_then(|pane| pane.parser.write().ok())
            .map(|mut parser| selection::pty_text(parser.screen_mut(), start, end))
            .unwrap_or_default()
    }
}
