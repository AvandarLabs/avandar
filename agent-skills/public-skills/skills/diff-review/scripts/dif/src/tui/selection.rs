//! Mouse text selection inside a pane, the way tmux does it: drag to select,
//! release to copy.
//!
//! A selection is stored in **content coordinates** rather than screen cells,
//! so it stays on the same text while the pane scrolls under it. A PTY pane's
//! content line is its viewport row minus the vt100 scrollback offset (history
//! lines are negative); a markdown view's is its viewport row plus the view's
//! vertical scroll. Columns add the view's horizontal scroll.

use ratatui::buffer::Buffer;
use ratatui::layout::Rect;
use ratatui::style::Color;

use super::app::Panel;
use super::main_diff_view::MainDiffView;

/// The background painted under selected cells.
const SELECTION_BG: Color = Color::Rgb(62, 88, 140);

/// A cell position in a pane's content coordinates.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub struct Point {
    /// Content line: see the module docs for how each pane derives it.
    pub line: i64,
    /// Content column.
    pub col: u16,
}

/// How a pane's viewport maps onto its content: `line = row + line_shift`,
/// `col = col + col_shift`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ContentOrigin {
    /// Added to a viewport row to get its content line.
    pub line_shift: i64,
    /// Added to a viewport column to get its content column.
    pub col_shift: u16,
}

impl ContentOrigin {
    /// The content point under viewport cell `(row, col)`.
    #[must_use]
    pub fn point_at(self, row: u16, col: u16) -> Point {
        Point {
            line: i64::from(row) + self.line_shift,
            col: col.saturating_add(self.col_shift),
        }
    }
}

/// What a selection was made by: a drag over cells, a double-click (a word),
/// or a triple-click (a line).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Unit {
    /// A press-and-drag; a press without a drag is a plain click.
    Cell,
    /// A double-click on a word.
    Word,
    /// A triple-click on a line.
    Line,
}

/// An in-progress or finished selection within one pane.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Selection {
    /// The pane the drag started in. A selection never spans panes.
    pub panel: Panel,
    /// The main pane's view when the drag started (ignored for the LLM pane),
    /// so switching views never paints a stale selection over other content.
    pub view: MainDiffView,
    /// Where the button went down.
    pub anchor: Point,
    /// Where the pointer is now (or was on release).
    pub head: Point,
    /// What made the selection. Only a [`Unit::Cell`] selection follows a drag.
    pub unit: Unit,
}

impl Selection {
    /// A zero-width selection at `point`, as a button press starts one.
    #[must_use]
    pub const fn start(panel: Panel, view: MainDiffView, point: Point) -> Self {
        Self::span(panel, view, Unit::Cell, point, point)
    }

    /// A word or line selection from `first` to `last`, both inclusive.
    #[must_use]
    pub const fn span(
        panel: Panel,
        view: MainDiffView,
        unit: Unit,
        first: Point,
        last: Point,
    ) -> Self {
        Self {
            panel,
            view,
            anchor: first,
            head: last,
            unit,
        }
    }

    /// The selection's endpoints in reading order, both inclusive.
    #[must_use]
    pub fn ordered(&self) -> (Point, Point) {
        if self.anchor <= self.head {
            (self.anchor, self.head)
        } else {
            (self.head, self.anchor)
        }
    }

    /// Whether the pointer never moved off the cell it pressed: a plain click.
    #[must_use]
    pub fn is_click(&self) -> bool {
        self.unit == Unit::Cell && self.anchor == self.head
    }

    /// Whether `point` falls inside the selection.
    #[must_use]
    pub fn contains(&self, point: Point) -> bool {
        let (start, end) = self.ordered();
        start <= point && point <= end
    }
}

/// Paint the selection's highlight over the cells of `area` it covers.
pub fn paint(buf: &mut Buffer, area: Rect, origin: ContentOrigin, selection: &Selection) {
    for row in 0..area.height {
        for col in 0..area.width {
            if selection.contains(origin.point_at(row, col)) {
                buf[(area.x + col, area.y + row)].set_bg(SELECTION_BG);
            }
        }
    }
}

/// The text a PTY selection covers, read from `screen` across its scrollback.
///
/// Lines that are scrolled out of view are brought into view one at a time, so
/// a selection taller than the pane copies in full; the screen's scroll offset
/// is restored before returning. A soft-wrapped row joins the next one without
/// a newline, as it would in the terminal.
pub fn pty_text(screen: &mut vt100::Screen, start: Point, end: Point) -> String {
    let saved = screen.scrollback();
    let (rows, cols) = screen.size();
    let mut out = String::new();
    for line in start.line..=end.line {
        screen.set_scrollback(usize::try_from(-line).unwrap_or(0));
        let shift = i64::try_from(screen.scrollback()).unwrap_or(0);
        let Some(row) = u16::try_from(line + shift).ok().filter(|r| *r < rows) else {
            continue;
        };
        let mut from = if line == start.line { start.col } else { 0 };
        // A drag that starts on the right half of a wide character (an emoji,
        // CJK) still copies the whole character.
        if screen
            .cell(row, from)
            .is_some_and(vt100::Cell::is_wide_continuation)
        {
            from = from.saturating_sub(1);
        }
        let to = if line == end.line {
            end.col.saturating_add(1).min(cols)
        } else {
            cols
        };
        let text = screen
            .rows(from, to.saturating_sub(from))
            .nth(usize::from(row))
            .unwrap_or_default();
        if line != end.line && screen.row_wrapped(row) {
            out.push_str(&text);
        } else {
            out.push_str(text.trim_end());
            if line != end.line {
                out.push('\n');
            }
        }
    }
    screen.set_scrollback(saved);
    out
}

/// The text a markdown selection covers in `lines` (one rendered line each).
/// Columns are character indexes, matching the guide view's cursor.
#[must_use]
pub fn lines_text(lines: &[String], start: Point, end: Point) -> String {
    let mut out = Vec::new();
    for line in start.line.max(0)..=end.line {
        let Some(text) = usize::try_from(line).ok().and_then(|i| lines.get(i)) else {
            break;
        };
        let from = if line == start.line {
            usize::from(start.col)
        } else {
            0
        };
        let to = if line == end.line {
            usize::from(end.col) + 1
        } else {
            usize::MAX
        };
        let piece: String = text.chars().take(to).skip(from).collect();
        out.push(piece.trim_end().to_owned());
    }
    out.join("\n")
}

#[cfg(test)]
mod tests {
    use super::*;

    const fn point(line: i64, col: u16) -> Point {
        Point { line, col }
    }

    fn selection(anchor: Point, head: Point) -> Selection {
        Selection {
            head,
            ..Selection::start(Panel::Llm, MainDiffView::Log, anchor)
        }
    }

    fn screen_with(rows: u16, cols: u16, text: &str) -> vt100::Parser {
        let mut parser = vt100::Parser::new(rows, cols, 100);
        parser.process(text.as_bytes());
        parser
    }

    #[test]
    fn a_backward_drag_orders_its_endpoints_in_reading_order() {
        let sel = selection(point(3, 5), point(1, 9));
        assert_eq!(sel.ordered(), (point(1, 9), point(3, 5)));
    }

    #[test]
    fn contains_covers_whole_middle_lines_but_only_part_of_the_ends() {
        let sel = selection(point(1, 4), point(3, 2));
        assert!(!sel.contains(point(1, 3)));
        assert!(sel.contains(point(1, 4)));
        assert!(sel.contains(point(2, 0)));
        assert!(sel.contains(point(2, 500)));
        assert!(sel.contains(point(3, 2)));
        assert!(!sel.contains(point(3, 3)));
    }

    #[test]
    fn a_selection_that_never_moved_is_a_click() {
        assert!(selection(point(2, 2), point(2, 2)).is_click());
        assert!(!selection(point(2, 2), point(2, 3)).is_click());
    }

    #[test]
    fn a_one_character_word_or_line_selection_is_not_a_click() {
        let one = point(2, 2);
        let word = Selection::span(Panel::Llm, MainDiffView::Log, Unit::Word, one, one);
        assert!(!word.is_click());
        let line = Selection::span(Panel::Llm, MainDiffView::Log, Unit::Line, one, one);
        assert!(!line.is_click());
    }

    #[test]
    fn a_scrolled_pty_origin_maps_rows_into_history() {
        let origin = ContentOrigin {
            line_shift: -10,
            col_shift: 0,
        };
        assert_eq!(origin.point_at(3, 7), point(-7, 7));
    }

    #[test]
    fn pty_text_copies_part_of_one_row() {
        let mut parser = screen_with(4, 20, "hello world\r\n");
        let text = pty_text(parser.screen_mut(), point(0, 6), point(0, 10));
        assert_eq!(text, "world");
    }

    #[test]
    fn pty_text_joins_rows_with_newlines_and_trims_trailing_blanks() {
        let mut parser = screen_with(4, 20, "first line\r\nsecond\r\nthird\r\n");
        let text = pty_text(parser.screen_mut(), point(0, 6), point(2, 2));
        assert_eq!(text, "line\nsecond\nthi");
    }

    #[test]
    fn pty_text_starting_on_the_right_half_of_a_wide_char_includes_it() {
        let mut parser = screen_with(4, 20, "🚀 go\r\n");
        let text = pty_text(parser.screen_mut(), point(0, 1), point(0, 4));
        assert_eq!(text, "🚀 go");
    }

    #[test]
    fn pty_text_drops_trailing_spaces_an_app_painted() {
        let mut parser = screen_with(4, 20, "abc      \r\nxyz");
        let text = pty_text(parser.screen_mut(), point(0, 0), point(1, 19));
        assert_eq!(text, "abc\nxyz");
    }

    #[test]
    fn pty_text_joins_a_soft_wrapped_row_without_a_newline() {
        let mut parser = screen_with(4, 5, "abcdefgh\r\n");
        let text = pty_text(parser.screen_mut(), point(0, 0), point(1, 4));
        assert_eq!(text, "abcdefgh");
    }

    #[test]
    fn pty_text_reads_lines_scrolled_out_of_view_and_restores_the_offset() {
        let mut parser = screen_with(3, 10, "l1\r\nl2\r\nl3\r\nl4\r\nl5\r\nl6");
        // The live screen shows l4..l6, so l1 is content line -3.
        parser.screen_mut().set_scrollback(1);
        let text = pty_text(parser.screen_mut(), point(-3, 0), point(2, 1));
        assert_eq!(text, "l1\nl2\nl3\nl4\nl5\nl6");
        assert_eq!(parser.screen().scrollback(), 1);
    }

    #[test]
    fn lines_text_slices_by_character_and_joins_lines() {
        let lines = vec![
            "# Café notes".to_owned(),
            "  body  ".to_owned(),
            "end".to_owned(),
        ];
        let text = lines_text(&lines, point(0, 2), point(2, 1));
        assert_eq!(text, "Café notes\n  body\nen");
    }

    #[test]
    fn lines_text_stops_at_the_last_line() {
        let lines = vec!["only".to_owned()];
        assert_eq!(lines_text(&lines, point(0, 0), point(5, 3)), "only");
    }

    #[test]
    fn paint_highlights_exactly_the_selected_cells() {
        let area = Rect::new(2, 1, 6, 3);
        let mut buf = Buffer::empty(Rect::new(0, 0, 10, 5));
        let origin = ContentOrigin {
            line_shift: 0,
            col_shift: 0,
        };
        paint(&mut buf, area, origin, &selection(point(0, 4), point(1, 1)));
        let painted: Vec<(u16, u16)> = (0..5)
            .flat_map(|y| (0..10).map(move |x| (x, y)))
            .filter(|&(x, y)| buf[(x, y)].bg == SELECTION_BG)
            .collect();
        assert_eq!(painted, vec![(6, 1), (7, 1), (2, 2), (3, 2)]);
    }
}
