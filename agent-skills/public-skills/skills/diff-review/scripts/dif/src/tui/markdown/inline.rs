//! Inline-span helpers for the markdown renderer: a composing style stack and
//! word-wrapping that preserves per-span styling.

use ratatui::style::{Color, Modifier, Style};
use ratatui::text::Span;

/// A stack of styles so nested emphasis (bold inside italic, inline code inside
/// a link, …) composes as spans open and unwinds as they close.
pub struct StyleStack {
    stack: Vec<Style>,
    cur: Style,
}

impl StyleStack {
    /// Start from a base style.
    #[must_use]
    pub const fn new(base: Style) -> Self {
        Self {
            stack: Vec::new(),
            cur: base,
        }
    }

    /// Layer a modifier (bold / italic / …) on top of the current style.
    pub fn push_modifier(&mut self, m: Modifier) {
        self.stack.push(self.cur);
        self.cur = self.cur.add_modifier(m);
    }

    /// Layer a foreground colour on top of the current style (inline code,
    /// links).
    pub fn push_fg(&mut self, c: Color) {
        self.stack.push(self.cur);
        self.cur = self.cur.fg(c);
    }

    /// Unwind the most recent layer.
    pub fn pop(&mut self) {
        if let Some(s) = self.stack.pop() {
            self.cur = s;
        }
    }

    /// The style spans should be emitted with right now.
    #[must_use]
    pub const fn current(&self) -> Style {
        self.cur
    }
}

/// Split `s` into runs that are either all-whitespace or all-non-whitespace,
/// tagging each with whether it is whitespace. Preserves order so a wrap can
/// drop leading whitespace at line breaks without losing inter-word gaps.
fn runs(s: &str) -> Vec<(bool, String)> {
    let mut out: Vec<(bool, String)> = Vec::new();
    for ch in s.chars() {
        let ws = ch.is_whitespace();
        match out.last_mut() {
            Some((prev_ws, buf)) if *prev_ws == ws => buf.push(ch),
            _ => out.push((ws, ch.to_string())),
        }
    }
    out
}

/// Greedily wrap `spans` to `width` columns, breaking only at whitespace and
/// keeping each word's style. Leading whitespace on a wrapped line is dropped.
/// Returns at least one (possibly empty) line.
#[must_use]
pub fn wrap_spans(spans: &[Span<'static>], width: usize) -> Vec<Vec<Span<'static>>> {
    let width = width.max(1);
    let mut lines: Vec<Vec<Span<'static>>> = Vec::new();
    let mut cur: Vec<Span<'static>> = Vec::new();
    let mut cur_w = 0usize;
    for span in spans {
        for (is_ws, text) in runs(&span.content) {
            let w = text.chars().count();
            if is_ws {
                if cur.is_empty() {
                    continue; // no leading whitespace on a line
                }
                if cur_w + w > width {
                    lines.push(std::mem::take(&mut cur));
                    cur_w = 0;
                    continue;
                }
            } else if cur_w + w > width && !cur.is_empty() {
                lines.push(std::mem::take(&mut cur));
                cur_w = 0;
            }
            cur.push(Span::styled(text, span.style));
            cur_w += w;
        }
    }
    if !cur.is_empty() {
        lines.push(cur);
    }
    if lines.is_empty() {
        lines.push(Vec::new());
    }
    lines
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn style_stack_composes_and_unwinds() {
        let mut s = StyleStack::new(Style::default());
        s.push_modifier(Modifier::BOLD);
        assert!(s.current().add_modifier.contains(Modifier::BOLD));
        s.push_modifier(Modifier::ITALIC);
        let both = s.current().add_modifier;
        assert!(both.contains(Modifier::BOLD) && both.contains(Modifier::ITALIC));
        s.pop();
        let after = s.current().add_modifier;
        assert!(after.contains(Modifier::BOLD) && !after.contains(Modifier::ITALIC));
    }

    #[test]
    fn wrap_breaks_on_word_boundaries() {
        let spans = vec![Span::raw("the quick brown fox")];
        let lines = wrap_spans(&spans, 9);
        let texts: Vec<String> = lines
            .iter()
            .map(|l| l.iter().map(|s| s.content.as_ref()).collect::<String>())
            .collect();
        // Each wrapped line fits within the width.
        for t in &texts {
            assert!(t.trim_end().chars().count() <= 9, "line {t:?} too wide");
        }
        // Words pack greedily and join back to the original.
        assert_eq!(texts, vec!["the quick".to_owned(), "brown fox".to_owned()]);
    }
}
