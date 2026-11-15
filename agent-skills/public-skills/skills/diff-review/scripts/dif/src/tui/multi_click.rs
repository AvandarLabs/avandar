//! Double- and triple-click selection: counting rapid presses on one cell, and
//! finding the word or line under the pointer.
//!
//! A line never reaches past its pane: a terminal pane's line is its row
//! (plus any soft-wrapped continuation rows in view), which is exactly the
//! pane's width, and a markdown line is clipped to the columns in view.

use std::time::{Duration, Instant};

/// How quickly presses on the same cell must follow each other to count as a
/// double or triple click (macOS's default double-click interval).
pub const MULTI_CLICK_INTERVAL: Duration = Duration::from_millis(500);

/// Characters that belong to a word besides letters and digits, so a
/// double-click takes a whole path, URL, or `file.rs:12` reference.
const WORD_PUNCTUATION: &str = "_-./~:@+%#?&=";

/// Counts consecutive presses on one cell: 1, 2, 3, then back to 1.
#[derive(Debug, Default)]
pub struct ClickTracker {
    last: Option<(Instant, u16, u16, u8)>,
}

impl ClickTracker {
    /// Record a press at `(column, row)` and return its click count.
    pub fn press(&mut self, at: Instant, column: u16, row: u16) -> u8 {
        let count = match self.last {
            Some((last_at, last_column, last_row, last_count))
                if (last_column, last_row) == (column, row)
                    && at.saturating_duration_since(last_at) <= MULTI_CLICK_INTERVAL =>
            {
                if last_count >= 3 {
                    1
                } else {
                    last_count + 1
                }
            }
            _ => 1,
        };
        self.last = Some((at, column, row, count));
        count
    }
}

/// Whether `ch` is part of a word for double-click selection.
#[must_use]
pub fn is_word_char(ch: char) -> bool {
    ch.is_alphanumeric() || WORD_PUNCTUATION.contains(ch)
}

/// The viewport columns `(first, last)` of the word under `(row, col)` in a
/// terminal screen, or `None` when the cell is blank or punctuation.
#[must_use]
pub fn pty_word(screen: &vt100::Screen, row: u16, col: u16) -> Option<(u16, u16)> {
    let (_, cols) = screen.size();
    let is_word = |c: u16| is_word_cell(screen, row, c);
    if col >= cols || !is_word(col) {
        return None;
    }
    let mut first = col;
    while first > 0 && is_word(first - 1) {
        first -= 1;
    }
    let mut last = col;
    while last + 1 < cols && is_word(last + 1) {
        last += 1;
    }
    Some((first, last))
}

/// Whether the cell holds a word character. The right half of a wide
/// character takes the class of its left half, so the character stays whole.
fn is_word_cell(screen: &vt100::Screen, row: u16, col: u16) -> bool {
    let Some(cell) = screen.cell(row, col) else {
        return false;
    };
    if cell.is_wide_continuation() {
        return col > 0 && is_word_cell(screen, row, col - 1);
    }
    cell.contents().chars().next().is_some_and(is_word_char)
}

/// The viewport rows `(first, last)` of the line through `row`: the row plus
/// the soft-wrapped rows joined to it that are in view.
#[must_use]
pub fn pty_line_rows(screen: &vt100::Screen, row: u16) -> (u16, u16) {
    let (rows, _) = screen.size();
    let mut first = row;
    while first > 0 && screen.row_wrapped(first - 1) {
        first -= 1;
    }
    let mut last = row;
    while last + 1 < rows && screen.row_wrapped(last) {
        last += 1;
    }
    (first, last)
}

/// The character columns `(first, last)` of the word under `col` in `line`.
#[must_use]
pub fn text_word(line: &str, col: usize) -> Option<(usize, usize)> {
    let chars: Vec<char> = line.chars().collect();
    if !chars.get(col).copied().is_some_and(is_word_char) {
        return None;
    }
    let first = chars[..col]
        .iter()
        .rposition(|ch| !is_word_char(*ch))
        .map_or(0, |i| i + 1);
    let last = chars[col..]
        .iter()
        .position(|ch| !is_word_char(*ch))
        .map_or(chars.len() - 1, |i| col + i - 1);
    Some((first, last))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn screen_with(rows: u16, cols: u16, text: &str) -> vt100::Parser {
        let mut parser = vt100::Parser::new(rows, cols, 0);
        parser.process(text.as_bytes());
        parser
    }

    #[test]
    fn quick_presses_on_one_cell_count_up_to_three_then_restart() {
        let start = Instant::now();
        let mut clicks = ClickTracker::default();
        let counts: Vec<u8> = (0..4)
            .map(|i| clicks.press(start + Duration::from_millis(100 * i), 5, 5))
            .collect();
        assert_eq!(counts, vec![1, 2, 3, 1]);
    }

    #[test]
    fn a_slow_press_or_a_different_cell_starts_over() {
        let start = Instant::now();
        let mut clicks = ClickTracker::default();
        assert_eq!(clicks.press(start, 5, 5), 1);
        assert_eq!(clicks.press(start + Duration::from_millis(600), 5, 5), 1);
        assert_eq!(clicks.press(start + Duration::from_millis(700), 6, 5), 1);
        assert_eq!(clicks.press(start + Duration::from_millis(800), 6, 5), 2);
    }

    #[test]
    fn words_take_paths_urls_and_line_refs_but_not_brackets_or_quotes() {
        for ch in ['a', 'Z', '7', 'é', '_', '-', '.', '/', ':', '?', '='] {
            assert!(is_word_char(ch), "{ch:?} is a word char");
        }
        for ch in [' ', '(', ')', '"', '\'', '[', ']', ',', '│', '<'] {
            assert!(!is_word_char(ch), "{ch:?} is not a word char");
        }
    }

    #[test]
    fn pty_word_spans_the_word_under_the_cell() {
        let parser = screen_with(3, 40, "open (src/tui/mouse.rs:12) now");
        assert_eq!(pty_word(parser.screen(), 0, 10), Some((6, 24)));
        assert_eq!(pty_word(parser.screen(), 0, 0), Some((0, 3)));
        assert_eq!(pty_word(parser.screen(), 0, 28), Some((27, 29)));
    }

    #[test]
    fn pty_word_is_none_on_a_blank_or_a_bracket() {
        let parser = screen_with(3, 40, "open (x) now");
        assert_eq!(pty_word(parser.screen(), 0, 4), None);
        assert_eq!(pty_word(parser.screen(), 0, 5), None);
        assert_eq!(pty_word(parser.screen(), 0, 30), None);
    }

    #[test]
    fn pty_word_keeps_a_wide_character_whole_from_either_half() {
        let parser = screen_with(3, 40, "x 漢字 y");
        assert_eq!(pty_word(parser.screen(), 0, 2), Some((2, 5)));
        assert_eq!(pty_word(parser.screen(), 0, 5), Some((2, 5)));
    }

    #[test]
    fn pty_line_rows_follow_soft_wraps_in_view() {
        // Row 0 is a lone line; rows 1-3 are one line wrapped at 5 columns.
        let parser = screen_with(5, 5, "solo\r\nabcdefghijkl\r\nend");
        assert_eq!(pty_line_rows(parser.screen(), 0), (0, 0));
        assert_eq!(pty_line_rows(parser.screen(), 2), (1, 3));
        assert_eq!(pty_line_rows(parser.screen(), 4), (4, 4));
    }

    #[test]
    fn text_word_spans_by_character() {
        assert_eq!(text_word("see café-menu.md now", 6), Some((4, 15)));
        assert_eq!(text_word("see café-menu.md now", 3), None);
        assert_eq!(text_word("short", 40), None);
    }
}
