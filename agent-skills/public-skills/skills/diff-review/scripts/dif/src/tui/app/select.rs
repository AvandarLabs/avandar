//! Drag-to-copy text selection over the panes. The selection model and text
//! extraction live in [`crate::tui::selection`]; this maps mouse cells onto
//! the pane under them and copies on release.

use std::time::Instant;

use crate::clipboard;
use crate::tui::mouse::{Overshoot, clamp_into};
use crate::tui::multi_click::{pty_line_rows, pty_word, text_word};
use crate::tui::selection::{self, ContentOrigin, Point, Selection, Unit};

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

    /// A left-button press, the `clicks`-th in a quick run on one cell: focus
    /// the pane under the pointer and start a selection there. A double-click
    /// selects the word under the pointer and a triple-click its line, never
    /// wider than the pane. A press outside both panes clears the selection.
    pub fn begin_selection(&mut self, column: u16, row: u16, clicks: u8) {
        self.selection = None;
        let Some(panel) = self.pane_areas.panel_at(column, row) else {
            return;
        };
        self.focus = panel;
        let area = self.pane_areas.of(panel);
        let Some(((r, c), _)) = clamp_into(area, column, row) else {
            return;
        };
        let Some(origin) = self.content_origin(panel) else {
            return;
        };
        let view = self.active_diff_view;
        self.selection = match clicks {
            2 => self
                .word_at(panel, origin, (r, c))
                .map(|(first, last)| Selection::span(panel, view, Unit::Word, first, last)),
            3 => {
                let (first, last) = self.line_at(panel, origin, r, area.width);
                Some(Selection::span(panel, view, Unit::Line, first, last))
            }
            _ => Some(Selection::start(panel, view, origin.point_at(r, c))),
        };
    }

    /// The word under the viewport cell `(r, c)` of `panel`, as content points.
    fn word_at(
        &self,
        panel: Panel,
        origin: ContentOrigin,
        (r, c): (u16, u16),
    ) -> Option<(Point, Point)> {
        if self.markdown_view_for(panel) {
            let at = origin.point_at(r, c);
            let line = self
                .active_markdown_ref()
                .lines()
                .get(usize::try_from(at.line).ok()?)?;
            let (first, last) = text_word(line, usize::from(at.col))?;
            let point = |col: usize| {
                u16::try_from(col)
                    .ok()
                    .map(|col| Point { line: at.line, col })
            };
            return Some((point(first)?, point(last)?));
        }
        let span = pty_word(self.pane_for(panel)?.parser.read().ok()?.screen(), r, c);
        let (first, last) = span?;
        Some((origin.point_at(r, first), origin.point_at(r, last)))
    }

    /// The line through viewport row `r` of `panel`, clipped to the pane's
    /// `width`: a terminal row plus its soft-wrapped rows in view, or the
    /// visible columns of a markdown line.
    fn line_at(&self, panel: Panel, origin: ContentOrigin, r: u16, width: u16) -> (Point, Point) {
        let last_col = width.saturating_sub(1);
        let rows = if self.markdown_view_for(panel) {
            None
        } else {
            self.pane_for(panel)
                .and_then(|pane| pane.parser.read().ok())
                .map(|parser| pty_line_rows(parser.screen(), r))
        };
        let (first_row, last_row) = rows.unwrap_or((r, r));
        (
            origin.point_at(first_row, 0),
            origin.point_at(last_row, last_col),
        )
    }

    /// A drag with the left button held: move the selection's head. Dragging
    /// past the top or bottom of a terminal pane scrolls it one row, so a
    /// selection can reach text that is out of view.
    pub fn extend_selection(&mut self, column: u16, row: u16) {
        let Some(sel) = self.selection.filter(|sel| sel.unit == Unit::Cell) else {
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
