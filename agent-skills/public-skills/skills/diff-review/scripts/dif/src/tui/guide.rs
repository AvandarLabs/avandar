//! The diff guide view's backing state: the loaded guide markdown, a cursor,
//! and the scroll offsets that keep the cursor on screen.
//!
//! The `diff-review` skill writes the guide markdown to disk; `dif` only
//! reads it. [`Guide::refresh`] re-reads the file and reports whether the
//! contents changed, so edits the skill makes (or a `Ctrl+G` regeneration) show
//! up without restarting the shell.
//!
//! The markdown is rendered to **styled** lines by [`super::markdown`] (colored
//! headings, bold, code, tables) and drawn as-is — `dif` keeps that styling.
//! Navigation is a thin cursor overlay: the cursor `(row, col)` is the single
//! source of truth, motions move it, and the draw layer derives the scroll
//! needed to keep it visible and paints a real terminal block cursor at it.
//! Motions arrive as [`VimMotion`](super::vim::VimMotion)s and are mapped here.

use std::fs;
use std::path::PathBuf;

use super::open_target::{self, Target};

/// The diff guide markdown plus the cursor and scroll the view is drawn with.
pub struct Guide {
    path: PathBuf,
    text: Option<String>,
    /// The plain text of each rendered line, refreshed by the draw layer; used
    /// to clamp the cursor, move by word, and resolve the token under it.
    lines: Vec<String>,
    /// Cursor position `(row, col)` in rendered-line space.
    cursor: (usize, usize),
    /// Vertical scroll: the first rendered row in view.
    scroll: u16,
    /// Horizontal scroll: the first rendered column in view (for wide tables /
    /// code blocks that exceed the pane width).
    hscroll: u16,
    /// The content area's size `(rows, cols)`, from the last draw.
    view: (u16, u16),
}

impl Guide {
    /// Load the guide at `path` (absent file → no text yet).
    #[must_use]
    pub fn new(path: PathBuf) -> Self {
        let text = fs::read_to_string(&path).ok();
        Self {
            path,
            text,
            lines: Vec::new(),
            cursor: (0, 0),
            scroll: 0,
            hscroll: 0,
            view: (0, 0),
        }
    }

    /// Re-read the guide from disk; returns `true` when the contents changed
    /// (including the file appearing or disappearing). Cheap to call each tick.
    pub fn refresh(&mut self) -> bool {
        let next = fs::read_to_string(&self.path).ok();
        if next == self.text {
            return false;
        }
        self.text = next;
        true
    }

    /// The loaded guide markdown, if the file exists. The draw layer uses this
    /// to decide between the rendered guide and the "no guide yet" hint.
    #[must_use]
    pub fn text(&self) -> Option<&str> {
        self.text.as_deref()
    }

    /// Record the plain text of the lines the draw layer just rendered and clamp
    /// the cursor back onto them (the content may have shrunk or re-wrapped).
    pub fn set_lines(&mut self, lines: Vec<String>) {
        self.lines = lines;
        self.clamp_cursor();
    }

    /// Record the content area's size and re-derive the scroll so the cursor is
    /// on screen. Called by the draw layer each frame after [`set_lines`].
    ///
    /// [`set_lines`]: Self::set_lines
    pub fn set_viewport(&mut self, rows: u16, cols: u16) {
        self.view = (rows, cols);
        self.ensure_visible();
    }

    /// The current vertical / horizontal scroll offsets, for the draw layer.
    #[must_use]
    pub const fn scroll(&self) -> (u16, u16) {
        (self.scroll, self.hscroll)
    }

    /// The cursor's absolute terminal position given the content area's origin,
    /// if it is within the viewport (it always is after [`set_viewport`]).
    ///
    /// [`set_viewport`]: Self::set_viewport
    #[must_use]
    pub fn cursor_screen_pos(&self, origin: (u16, u16)) -> Option<(u16, u16)> {
        let (rows, cols) = self.view;
        let row = u16::try_from(self.cursor.0).ok()?;
        let col = u16::try_from(self.cursor.1).ok()?;
        let vrow = row.checked_sub(self.scroll)?;
        let vcol = col.checked_sub(self.hscroll)?;
        if vrow >= rows || vcol >= cols {
            return None;
        }
        Some((origin.0.saturating_add(vcol), origin.1.saturating_add(vrow)))
    }

    /// Move the cursor down `n` lines.
    pub fn cursor_down(&mut self, n: u16) {
        self.cursor.0 = self.cursor.0.saturating_add(usize::from(n));
        self.clamp_cursor();
    }

    /// Move the cursor up `n` lines.
    pub fn cursor_up(&mut self, n: u16) {
        self.cursor.0 = self.cursor.0.saturating_sub(usize::from(n));
        self.clamp_cursor();
    }

    /// Move the cursor left `n` columns.
    pub fn cursor_left(&mut self, n: u16) {
        self.cursor.1 = self.cursor.1.saturating_sub(usize::from(n));
    }

    /// Move the cursor right `n` columns (clamped to the line length).
    pub fn cursor_right(&mut self, n: u16) {
        self.cursor.1 = self.cursor.1.saturating_add(usize::from(n));
        self.clamp_cursor();
    }

    /// Move the cursor forward `n` words.
    pub fn word_forward(&mut self, n: u16) {
        for _ in 0..n.max(1) {
            self.cursor = word_forward(&self.lines, self.cursor);
        }
    }

    /// Move the cursor back `n` words.
    pub fn word_back(&mut self, n: u16) {
        for _ in 0..n.max(1) {
            self.cursor = word_back(&self.lines, self.cursor);
        }
    }

    /// Move the cursor down half a viewport.
    pub fn half_page_down(&mut self) {
        self.cursor_down(self.half_page());
    }

    /// Move the cursor up half a viewport.
    pub fn half_page_up(&mut self) {
        self.cursor_up(self.half_page());
    }

    /// Jump the cursor to the top of the guide.
    pub const fn to_top(&mut self) {
        self.cursor = (0, 0);
    }

    /// Jump the cursor to the bottom of the guide.
    pub fn to_bottom(&mut self) {
        self.cursor = (self.lines.len().saturating_sub(1), 0);
        self.clamp_cursor();
    }

    /// The [`Target`] under the cursor, if it's on a path or URL token.
    #[must_use]
    pub fn target_under_cursor(&self) -> Option<Target> {
        let line = self.lines.get(self.cursor.0)?;
        let token = open_target::token_at(line, self.cursor.1)?;
        open_target::classify(&token)
    }

    /// Half the current viewport height, at least 1.
    const fn half_page(&self) -> u16 {
        let h = self.view.0 / 2;
        if h == 0 { 1 } else { h }
    }

    /// Clamp the cursor to the loaded content (row to the last line, column to
    /// that line's length).
    fn clamp_cursor(&mut self) {
        if self.lines.is_empty() {
            self.cursor = (0, 0);
            return;
        }
        let last_row = self.lines.len() - 1;
        let row = self.cursor.0.min(last_row);
        let line_len = self.lines[row].chars().count();
        self.cursor = (row, self.cursor.1.min(line_len));
    }

    /// Re-derive `scroll` / `hscroll` so the cursor sits inside the viewport,
    /// moving the viewport as little as possible.
    fn ensure_visible(&mut self) {
        let (rows, cols) = (self.view.0, self.view.1);
        let cur_row = u16::try_from(self.cursor.0).unwrap_or(u16::MAX);
        let cur_col = u16::try_from(self.cursor.1).unwrap_or(u16::MAX);
        self.scroll = clamp_offset(self.scroll, cur_row, rows);
        self.hscroll = clamp_offset(self.hscroll, cur_col, cols);
    }
}

/// Adjust a scroll `offset` so position `pos` is within `[offset, offset+span)`,
/// scrolling the minimum distance. A zero `span` leaves the offset unchanged.
const fn clamp_offset(offset: u16, pos: u16, span: u16) -> u16 {
    if span == 0 {
        return offset;
    }
    if pos < offset {
        pos
    } else if pos >= offset.saturating_add(span) {
        pos.saturating_sub(span - 1)
    } else {
        offset
    }
}

/// The position of the next word start at or after `(row, col)`, scanning in
/// reading order; clamps to the last line's end when there is none.
fn word_forward(lines: &[String], (row, col): (usize, usize)) -> (usize, usize) {
    for (r, line) in lines.iter().enumerate().skip(row) {
        for s in word_starts(line) {
            if r > row || s > col {
                return (r, s);
            }
        }
    }
    lines.len().checked_sub(1).map_or((row, col), |r| {
        (r, lines[r].chars().count().saturating_sub(1))
    })
}

/// The position of the previous word start before `(row, col)`, scanning
/// backward; clamps to the very start when there is none.
fn word_back(lines: &[String], (row, col): (usize, usize)) -> (usize, usize) {
    for r in (0..=row.min(lines.len().saturating_sub(1))).rev() {
        for s in word_starts(&lines[r]).into_iter().rev() {
            if r < row || s < col {
                return (r, s);
            }
        }
    }
    (0, 0)
}

/// The column of each word start in `line` (a non-space char at column 0 or
/// preceded by a space).
fn word_starts(line: &str) -> Vec<usize> {
    let mut cols = Vec::new();
    let mut prev_space = true;
    for (i, ch) in line.chars().enumerate() {
        let is_space = ch.is_whitespace();
        if !is_space && prev_space {
            cols.push(i);
        }
        prev_space = is_space;
    }
    cols
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    fn write(path: &std::path::Path, body: &str) {
        let mut f = fs::File::create(path).expect("create");
        f.write_all(body.as_bytes()).expect("write");
    }

    fn guide_with(lines: &[&str]) -> Guide {
        let dir = tempfile::tempdir().expect("tempdir");
        let mut g = Guide::new(dir.path().join("absent.md"));
        g.set_lines(lines.iter().map(|s| (*s).to_owned()).collect());
        g.set_viewport(10, 40);
        g
    }

    #[test]
    fn refresh_detects_content_changes_and_removal() {
        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir.path().join("guide.md");
        write(&path, "# v1");

        let mut g = Guide::new(path.clone());
        assert_eq!(g.text(), Some("# v1"));
        assert!(!g.refresh(), "no change yet");

        write(&path, "# v2");
        assert!(g.refresh(), "content changed");
        assert_eq!(g.text(), Some("# v2"));

        fs::remove_file(&path).expect("remove");
        assert!(g.refresh(), "file removal is a change");
        assert_eq!(g.text(), None);
    }

    #[test]
    fn cursor_motions_move_and_clamp_within_content() {
        let mut g = guide_with(&["one", "two", "three"]);
        g.cursor_down(2);
        assert_eq!(g.cursor, (2, 0));
        // Past the end clamps to the last line.
        g.cursor_down(9);
        assert_eq!(g.cursor.0, 2);
        g.to_top();
        assert_eq!(g.cursor, (0, 0));
        g.to_bottom();
        assert_eq!(g.cursor.0, 2);
        // Column clamps to the line length ("three" → 5).
        g.cursor_right(99);
        assert_eq!(g.cursor.1, 5);
    }

    #[test]
    fn word_motions_step_between_words_across_lines() {
        let mut g = guide_with(&["the  quick", "brown"]);
        // Starts: line0 cols 0,5; line1 col 0.
        assert_eq!(g.cursor, (0, 0));
        g.word_forward(1);
        assert_eq!(g.cursor, (0, 5));
        g.word_forward(1);
        assert_eq!(g.cursor, (1, 0));
        g.word_back(1);
        assert_eq!(g.cursor, (0, 5));
    }

    #[test]
    fn target_under_cursor_reads_the_token_at_the_cursor() {
        let g = guide_with(&["src/app.rs:L4 trailing"]);
        assert_eq!(
            g.target_under_cursor(),
            Some(Target::File {
                path: "src/app.rs".to_owned(),
                line: 4,
            })
        );
    }

    #[test]
    fn scroll_follows_the_cursor_off_screen() {
        // Viewport is 10 rows tall; moving to row 20 must scroll down. The draw
        // layer re-runs `set_viewport` each frame, which is where the scroll is
        // re-derived, so simulate that after the motion.
        let lines: Vec<&str> = (0..30).map(|_| "x").collect();
        let mut g = guide_with(&lines);
        g.cursor_down(20);
        g.set_viewport(10, 40);
        let (vscroll, _) = g.scroll();
        assert_eq!(vscroll, 11, "cursor 20 visible in a 10-row viewport");
        assert!(g.cursor_screen_pos((0, 0)).is_some(), "cursor on screen");
        // Back to the top re-baselines the scroll.
        g.to_top();
        g.set_viewport(10, 40);
        assert_eq!(g.scroll().0, 0);
    }

    #[test]
    fn clamp_offset_scrolls_minimally() {
        assert_eq!(clamp_offset(5, 3, 10), 3, "scroll up to reveal above");
        assert_eq!(clamp_offset(0, 12, 10), 3, "scroll down to reveal below");
        assert_eq!(clamp_offset(4, 6, 10), 4, "already visible: unchanged");
    }
}
