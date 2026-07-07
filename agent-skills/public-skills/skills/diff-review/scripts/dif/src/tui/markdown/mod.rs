//! Render diff-guide markdown into ratatui [`Text`] for the diff guide view.
//!
//! Parsing is delegated to `pulldown-cmark` (the canonical Rust CommonMark/GFM
//! parser); this module walks its event stream and builds styled lines so the
//! guide renders as real headings, lists, emphasis, and **tables** instead of
//! plaintext. Prose is word-wrapped to the pane width; tables are sized by
//! [`table`]. Inline emphasis inside table cells is intentionally flattened to
//! plain text (the whole view is monospace).

mod inline;
mod table;

use pulldown_cmark::{Event, HeadingLevel, Options, Parser, Tag, TagEnd};
use ratatui::style::{Color, Modifier, Style};
use ratatui::text::{Line, Span, Text};

use inline::{StyleStack, wrap_spans};
use table::TableBuilder;

/// Render `md` into wrapped, styled [`Text`] sized for a `width`-column pane.
#[must_use]
pub fn render(md: &str, width: u16) -> Text<'static> {
    let mut r = Renderer::new(width);
    let opts = Options::ENABLE_TABLES | Options::ENABLE_STRIKETHROUGH | Options::ENABLE_TASKLISTS;
    for ev in Parser::new_ext(md, opts) {
        r.event(&ev);
    }
    r.finish()
}

/// Mutable state for one render pass.
struct Renderer {
    width: usize,
    lines: Vec<Line<'static>>,
    cur: Vec<Span<'static>>,
    style: StyleStack,
    /// Open ordered-list counters (`None` = unordered) by nesting depth.
    lists: Vec<Option<u64>>,
    /// Prefix (bullet / number) for the first line of the current list item.
    pending_prefix: Option<String>,
    /// Continuation indent (columns) for wrapped lines of the current block.
    indent: usize,
    in_code_block: bool,
    table: Option<TableBuilder>,
}

impl Renderer {
    fn new(width: u16) -> Self {
        Self {
            width: usize::from(width).max(1),
            lines: Vec::new(),
            cur: Vec::new(),
            style: StyleStack::new(Style::default()),
            lists: Vec::new(),
            pending_prefix: None,
            indent: 0,
            in_code_block: false,
            table: None,
        }
    }

    fn finish(mut self) -> Text<'static> {
        self.emit_current();
        Text::from(self.lines)
    }

    fn event(&mut self, ev: &Event<'_>) {
        match ev {
            Event::Start(tag) => self.start(tag),
            Event::End(tag) => self.end(*tag),
            Event::Text(t) => self.text(t),
            Event::Code(c) => self.code(c),
            Event::SoftBreak => self.push_span(Span::raw(" ")),
            Event::HardBreak => self.emit_current(),
            Event::Rule => self.rule(),
            Event::TaskListMarker(done) => {
                let mark = if *done { "[x] " } else { "[ ] " };
                self.push_span(Span::styled(mark, Style::default().fg(Color::Rgb(122, 134, 173))));
            }
            _ => {}
        }
    }

    fn start(&mut self, tag: &Tag<'_>) {
        match tag {
            Tag::Heading { level, .. } => {
                self.emit_current();
                self.blank();
                self.style.push_fg(heading_color(*level));
                self.style.push_modifier(Modifier::BOLD);
            }
            Tag::Strong => self.style.push_modifier(Modifier::BOLD),
            Tag::Emphasis => self.style.push_modifier(Modifier::ITALIC),
            Tag::Strikethrough => self.style.push_modifier(Modifier::CROSSED_OUT),
            Tag::Link { .. } => self.style.push_fg(Color::Rgb(125, 207, 255)),
            Tag::List(start) => self.lists.push(*start),
            Tag::Item => self.begin_item(),
            Tag::CodeBlock(_) => {
                self.emit_current();
                self.in_code_block = true;
            }
            Tag::Table(aligns) => self.table = Some(TableBuilder::new(aligns.clone())),
            Tag::TableHead => {
                if let Some(t) = self.table.as_mut() {
                    t.set_head(true);
                }
            }
            _ => {}
        }
    }

    fn end(&mut self, tag: TagEnd) {
        match tag {
            TagEnd::Heading(_) => {
                self.style.pop();
                self.style.pop();
                self.emit_current();
                self.blank();
            }
            TagEnd::Strong | TagEnd::Emphasis | TagEnd::Strikethrough | TagEnd::Link => {
                self.style.pop();
            }
            TagEnd::Paragraph => {
                self.emit_current();
                if self.lists.is_empty() {
                    self.blank();
                }
            }
            TagEnd::List(_) => {
                self.lists.pop();
                if self.lists.is_empty() {
                    self.blank();
                }
            }
            TagEnd::Item => self.emit_current(),
            TagEnd::CodeBlock => {
                self.in_code_block = false;
                self.blank();
            }
            TagEnd::TableHead => {
                if let Some(t) = self.table.as_mut() {
                    t.end_row();
                    t.set_head(false);
                }
            }
            TagEnd::TableRow => {
                if let Some(t) = self.table.as_mut() {
                    t.end_row();
                }
            }
            TagEnd::TableCell => {
                if let Some(t) = self.table.as_mut() {
                    t.end_cell();
                }
            }
            TagEnd::Table => {
                if let Some(t) = self.table.take() {
                    let width = u16::try_from(self.width).unwrap_or(u16::MAX);
                    self.lines.extend(t.render(width));
                    self.blank();
                }
            }
            _ => {}
        }
    }

    fn text(&mut self, t: &str) {
        if let Some(table) = self.table.as_mut() {
            table.push_text(t);
        } else if self.in_code_block {
            self.emit_code_block(t);
        } else {
            let style = self.style.current();
            self.push_span(Span::styled(t.to_owned(), style));
        }
    }

    fn code(&mut self, c: &str) {
        if let Some(table) = self.table.as_mut() {
            table.push_text(c);
            return;
        }
        let style = self.style.current().fg(Color::Rgb(158, 206, 106));
        self.push_span(Span::styled(c.to_owned(), style));
    }

    /// A fenced code block: one rendered line per source line, dimmed/indented.
    fn emit_code_block(&mut self, text: &str) {
        let style = Style::default().fg(Color::Rgb(158, 206, 106));
        for line in text.split('\n') {
            if line.is_empty() {
                continue;
            }
            self.lines
                .push(Line::from(Span::styled(format!("  {line}"), style)));
        }
    }

    fn begin_item(&mut self) {
        let depth = self.lists.len();
        let base = depth.saturating_sub(1) * 2;
        let bullet = match self.lists.last_mut() {
            Some(Some(n)) => {
                let s = format!("{n}. ");
                *n += 1;
                s
            }
            _ => "• ".to_owned(),
        };
        let prefix = format!("{}{bullet}", " ".repeat(base));
        self.indent = prefix.chars().count();
        self.pending_prefix = Some(prefix);
    }

    fn rule(&mut self) {
        self.emit_current();
        self.lines.push(Line::from(Span::styled(
            "─".repeat(self.width),
            Style::default().fg(Color::Rgb(78, 92, 122)),
        )));
    }

    fn push_span(&mut self, span: Span<'static>) {
        self.cur.push(span);
    }

    /// Append a blank line unless the last line is already blank.
    fn blank(&mut self) {
        let last_blank = self
            .lines
            .last()
            .is_some_and(|l| l.spans.iter().all(|s| s.content.trim().is_empty()));
        if !self.lines.is_empty() && !last_blank {
            self.lines.push(Line::default());
        }
    }

    /// Wrap and flush the current line buffer, applying the pending list-item
    /// prefix to the first wrapped line and the continuation indent to the rest.
    fn emit_current(&mut self) {
        if self.cur.is_empty() && self.pending_prefix.is_none() {
            return;
        }
        let prefix = self.pending_prefix.take();
        let prefix_w = prefix.as_ref().map_or(self.indent, |p| p.chars().count());
        let avail = self.width.saturating_sub(prefix_w).max(1);
        let wrapped = wrap_spans(&self.cur, avail);
        let dim = Style::default().fg(Color::Rgb(122, 134, 173));
        for (i, line_spans) in wrapped.into_iter().enumerate() {
            let mut spans = Vec::with_capacity(line_spans.len() + 1);
            let lead = if i == 0 {
                prefix.clone().unwrap_or_default()
            } else {
                " ".repeat(prefix_w)
            };
            if !lead.is_empty() {
                spans.push(Span::styled(lead, dim));
            }
            spans.extend(line_spans);
            self.lines.push(Line::from(spans));
        }
        self.cur.clear();
        self.indent = 0;
    }
}

/// Heading colour by level (h1/h2 stand out; deeper headings reuse h3's hue).
const fn heading_color(level: HeadingLevel) -> Color {
    match level {
        HeadingLevel::H1 => Color::Rgb(187, 154, 247),
        HeadingLevel::H2 => Color::Rgb(125, 207, 255),
        _ => Color::Rgb(255, 199, 119),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn plain(text: &Text) -> String {
        text.lines
            .iter()
            .map(|l| l.iter().map(|s| s.content.as_ref()).collect::<String>())
            .collect::<Vec<_>>()
            .join("\n")
    }

    #[test]
    fn heading_text_is_bold() {
        let t = render("# Group 1", 60);
        // Word-wrap splits the heading into per-word spans; each carries BOLD.
        let bold = t
            .lines
            .iter()
            .flat_map(|l| l.spans.iter())
            .any(|s| s.content.contains("Group") && s.style.add_modifier.contains(Modifier::BOLD));
        assert!(bold, "heading should be bold");
    }

    #[test]
    fn bold_inline_carries_modifier() {
        let t = render("a **strong** word", 60);
        let has_bold = t
            .lines
            .iter()
            .flat_map(|l| l.spans.iter())
            .any(|s| s.content == "strong" && s.style.add_modifier.contains(Modifier::BOLD));
        assert!(has_bold);
    }

    #[test]
    fn unordered_list_renders_bullets() {
        let t = render("- alpha\n- beta", 60);
        let out = plain(&t);
        assert!(out.contains("• alpha"), "got: {out:?}");
        assert!(out.contains("• beta"), "got: {out:?}");
    }

    #[test]
    fn table_renders_with_borders_and_cells() {
        let md = "| File | Status |\n| --- | --- |\n| a.rs | done |";
        let out = plain(&render(md, 60));
        assert!(out.contains('┌') && out.contains('│'), "no table borders: {out:?}");
        assert!(out.contains("File") && out.contains("Status"));
        assert!(out.contains("a.rs") && out.contains("done"));
    }

    #[test]
    fn long_prose_wraps_within_width() {
        let t = render("one two three four five six seven eight nine ten", 16);
        for l in &t.lines {
            let w: usize = l.iter().map(|s| s.content.chars().count()).sum();
            assert!(w <= 16, "line exceeds width: {w}");
        }
    }
}
