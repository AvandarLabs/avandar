//! Rendering GFM tables into box-drawn ratatui lines sized to the pane width.
//!
//! Cell contents are kept as plain text (the whole guide view is monospace, so
//! the table's value is its structure and alignment, not in-cell emphasis).
//! Columns take their natural width, then shrink proportionally and truncate
//! with `…` when the table would overflow the available width.

use pulldown_cmark::Alignment;
use ratatui::style::{Color, Modifier, Style};
use ratatui::text::{Line, Span};

/// Accumulates a markdown table's cells as parsing walks its events.
pub struct TableBuilder {
    aligns: Vec<Alignment>,
    head: Vec<String>,
    rows: Vec<Vec<String>>,
    in_head: bool,
    cur_row: Vec<String>,
    cur_cell: String,
}

impl TableBuilder {
    /// Start a table with the given per-column alignments.
    #[must_use]
    pub const fn new(aligns: Vec<Alignment>) -> Self {
        Self {
            aligns,
            head: Vec::new(),
            rows: Vec::new(),
            in_head: false,
            cur_row: Vec::new(),
            cur_cell: String::new(),
        }
    }

    /// Enter / leave the header row.
    pub const fn set_head(&mut self, in_head: bool) {
        self.in_head = in_head;
    }

    /// Append text to the cell currently being parsed.
    pub fn push_text(&mut self, text: &str) {
        self.cur_cell.push_str(text);
    }

    /// Finish the current cell.
    pub fn end_cell(&mut self) {
        self.cur_row.push(std::mem::take(&mut self.cur_cell).trim().to_owned());
    }

    /// Finish the current row (header or body).
    pub fn end_row(&mut self) {
        let row = std::mem::take(&mut self.cur_row);
        if self.in_head {
            self.head = row;
        } else {
            self.rows.push(row);
        }
    }

    /// Render the table to lines fitting `width` columns.
    #[must_use]
    pub fn render(&self, width: u16) -> Vec<Line<'static>> {
        let ncols = self.col_count();
        if ncols == 0 {
            return Vec::new();
        }
        let widths = self.column_widths(ncols, usize::from(width));
        let border = Style::default().fg(Color::Rgb(78, 92, 122));
        let head_style = Style::default()
            .fg(Color::Rgb(187, 154, 247))
            .add_modifier(Modifier::BOLD);

        let mut lines = Vec::with_capacity(self.rows.len() + 4);
        lines.push(rule(&widths, '┌', '┬', '┐', border));
        lines.push(self.data_line(&self.head, &widths, ncols, head_style, border));
        lines.push(rule(&widths, '├', '┼', '┤', border));
        for row in &self.rows {
            lines.push(self.data_line(row, &widths, ncols, Style::default(), border));
        }
        lines.push(rule(&widths, '└', '┴', '┘', border));
        lines
    }

    fn col_count(&self) -> usize {
        let body_max = self.rows.iter().map(Vec::len).max().unwrap_or(0);
        self.head.len().max(body_max).max(self.aligns.len())
    }

    /// Natural column widths, shrunk proportionally to fit `avail` columns.
    fn column_widths(&self, ncols: usize, avail: usize) -> Vec<usize> {
        let mut widths = vec![0usize; ncols];
        for (i, w) in widths.iter_mut().enumerate() {
            let head = self.head.get(i).map_or(0, |c| c.chars().count());
            let body = self
                .rows
                .iter()
                .map(|r| r.get(i).map_or(0, |c| c.chars().count()))
                .max()
                .unwrap_or(0);
            *w = head.max(body).max(1);
        }
        // Chrome: "│ " + " " between/after each column => 3 per column + 1.
        let chrome = 3 * ncols + 1;
        let natural: usize = widths.iter().sum();
        if natural + chrome <= avail || avail <= chrome {
            return widths;
        }
        let budget = avail - chrome;
        for w in &mut widths {
            // Proportional shrink, never below 1.
            *w = ((*w * budget) / natural).max(1);
        }
        widths
    }

    fn data_line(
        &self,
        row: &[String],
        widths: &[usize],
        ncols: usize,
        cell_style: Style,
        border: Style,
    ) -> Line<'static> {
        let mut spans = vec![Span::styled("│", border)];
        for (i, &w) in widths.iter().enumerate().take(ncols) {
            let raw = row.get(i).map_or("", String::as_str);
            let align = self.aligns.get(i).copied().unwrap_or(Alignment::None);
            let cell = pad(raw, w, align);
            spans.push(Span::styled(format!(" {cell} "), cell_style));
            spans.push(Span::styled("│", border));
        }
        Line::from(spans)
    }
}

/// A horizontal rule line (`┌──┬──┐` family) for the given column widths.
fn rule(widths: &[usize], left: char, mid: char, right: char, style: Style) -> Line<'static> {
    let mut s = String::new();
    s.push(left);
    for (i, w) in widths.iter().enumerate() {
        if i > 0 {
            s.push(mid);
        }
        for _ in 0..(w + 2) {
            s.push('─');
        }
    }
    s.push(right);
    Line::from(Span::styled(s, style))
}

/// Truncate (`…`) or pad `text` to exactly `width` columns under `align`.
fn pad(text: &str, width: usize, align: Alignment) -> String {
    let len = text.chars().count();
    if len > width {
        let keep = width.saturating_sub(1);
        let mut t: String = text.chars().take(keep).collect();
        t.push('…');
        return t;
    }
    let fill = width - len;
    match align {
        Alignment::Right => format!("{}{}", " ".repeat(fill), text),
        Alignment::Center => {
            let l = fill / 2;
            format!("{}{}{}", " ".repeat(l), text, " ".repeat(fill - l))
        }
        _ => format!("{}{}", text, " ".repeat(fill)),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn build() -> TableBuilder {
        let mut t = TableBuilder::new(vec![Alignment::Left, Alignment::Left]);
        t.set_head(true);
        t.push_text("File");
        t.end_cell();
        t.push_text("Status");
        t.end_cell();
        t.end_row();
        t.set_head(false);
        t.push_text("a.rs");
        t.end_cell();
        t.push_text("done");
        t.end_cell();
        t.end_row();
        t
    }

    #[test]
    fn renders_header_separator_and_rows() {
        let lines = build().render(60);
        let text: Vec<String> = lines
            .iter()
            .map(|l| l.iter().map(|s| s.content.as_ref()).collect::<String>())
            .collect();
        assert!(text[0].starts_with('┌') && text[0].contains('┬'));
        assert!(text[1].contains("File") && text[1].contains("Status"));
        assert!(text[2].starts_with('├'));
        assert!(text.iter().any(|l| l.contains("a.rs") && l.contains("done")));
        assert!(text.last().unwrap().starts_with('└'));
    }

    #[test]
    fn truncates_when_too_narrow() {
        let mut t = TableBuilder::new(vec![Alignment::Left]);
        t.set_head(true);
        t.push_text("a-very-long-header-column");
        t.end_cell();
        t.end_row();
        let lines = t.render(12);
        let header: String = lines[1].iter().map(|s| s.content.as_ref()).collect();
        assert!(header.contains('…'), "narrow column should truncate: {header:?}");
    }
}
