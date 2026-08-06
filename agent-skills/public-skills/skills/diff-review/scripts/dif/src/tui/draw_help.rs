//! The `Alt+S` keyboard-shortcuts help modal.
//!
//! A centered, bordered box over the two panes listing every binding grouped by
//! surface (from [`super::shortcuts`]). Read-only; `Esc` / `Alt+S` / `Ctrl+C`
//! close it (handled in `event_loop`). Mirrors the palette modal's chrome.

use ratatui::{
    Frame,
    layout::Rect,
    style::{Color, Modifier, Style},
    text::{Line, Span},
    widgets::{Block, BorderType, Borders, Clear, Paragraph},
};

use super::shortcuts::{self, Group};

/// Render the shortcuts help modal centered over `area`.
pub fn draw_help(f: &mut Frame, area: Rect) {
    let lines = build_lines();
    let content_h = u16::try_from(lines.len()).unwrap_or(u16::MAX);
    // borders (2) around the content.
    let height = content_h.saturating_add(2).min(area.height);
    let width = 66.min(area.width);
    let modal = centered_rect(width, height, area);
    f.render_widget(Clear, modal);

    let accent = Color::Rgb(255, 199, 119);
    let block = Block::default()
        .borders(Borders::ALL)
        .border_type(BorderType::Rounded)
        .border_style(Style::default().fg(accent))
        .title(Line::from(vec![
            Span::raw(" "),
            Span::styled(
                "Keyboard shortcuts",
                Style::default().fg(accent).add_modifier(Modifier::BOLD),
            ),
            Span::styled(
                "  ·  Esc to close ",
                Style::default().fg(Color::Rgb(122, 134, 173)),
            ),
        ]));
    let inner = block.inner(modal);
    f.render_widget(block, modal);
    f.render_widget(Paragraph::new(lines), inner);
}

/// Build the grouped shortcut lines: a heading per [`Group::ORDER`], then each
/// binding as `keys` (bold, padded) + `desc` (dim).
fn build_lines() -> Vec<Line<'static>> {
    let heading = Style::default()
        .fg(Color::Rgb(255, 199, 119))
        .add_modifier(Modifier::BOLD);
    let key = Style::default()
        .fg(Color::Rgb(192, 202, 245))
        .add_modifier(Modifier::BOLD);
    let desc = Style::default().fg(Color::Rgb(154, 165, 199));

    let mut lines: Vec<Line<'static>> = Vec::new();
    for (gi, group) in Group::ORDER.iter().enumerate() {
        if gi > 0 {
            lines.push(Line::default());
        }
        lines.push(Line::from(Span::styled(group.title(), heading)));
        for s in shortcuts::in_group(*group) {
            lines.push(Line::from(vec![
                Span::raw("  "),
                Span::styled(format!("{:<15}", s.keys), key),
                Span::styled(s.desc, desc),
            ]));
        }
    }
    lines
}

/// A `width`×`height` rect centered within `area` (both clamped to `area`).
fn centered_rect(width: u16, height: u16, area: Rect) -> Rect {
    let w = width.min(area.width);
    let h = height.min(area.height);
    Rect {
        x: area.x + (area.width.saturating_sub(w)) / 2,
        y: area.y + (area.height.saturating_sub(h)) / 2,
        width: w,
        height: h,
    }
}
