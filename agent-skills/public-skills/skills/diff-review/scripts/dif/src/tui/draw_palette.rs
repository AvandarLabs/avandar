//! Drawing the global command-palette modal.
//!
//! A centered, bordered box over the two panes: a filter input, a separator,
//! the numbered command list, and a key-hint footer. Adapted from the `tasks`
//! shell's palette renderer, minus its task-context subtitle.

use ratatui::{
    Frame,
    layout::{Constraint, Direction, Layout, Rect},
    style::{Color, Modifier, Style},
    text::{Line, Span},
    widgets::{Block, BorderType, Borders, Clear, Paragraph},
};

use super::modal_layout::centered_rect;
use super::palette::PaletteState;

/// Render the command palette centered over `area`.
pub fn draw_palette(f: &mut Frame, state: &PaletteState, area: Rect) {
    let entries = state.numbered_entries();
    // Inner height: filter + separator + list (≥1) + footer = 4 + list rows.
    let list_h = u16::try_from(entries.len()).unwrap_or(u16::MAX);
    let height = list_h.saturating_add(4).max(7).min(area.height);
    let modal = centered_rect(60.min(area.width), height, area);
    f.render_widget(Clear, modal);

    let accent = Color::Rgb(187, 154, 247);
    let block = Block::default()
        .borders(Borders::ALL)
        .border_type(BorderType::Rounded)
        .border_style(Style::default().fg(accent))
        .title(Line::from(vec![
            Span::raw(" "),
            Span::styled(
                state.title(),
                Style::default().fg(accent).add_modifier(Modifier::BOLD),
            ),
            Span::raw(" "),
        ]));
    let inner = block.inner(modal);
    f.render_widget(block, modal);

    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(1), // filter
            Constraint::Length(1), // separator
            Constraint::Min(1),    // list
            Constraint::Length(1), // footer
        ])
        .split(inner);

    // Filter input with a visible cursor.
    let filter_area = chunks[0];
    let prompt = Line::from(vec![
        Span::styled(
            " > ",
            Style::default().fg(accent).add_modifier(Modifier::BOLD),
        ),
        Span::styled(
            state.filter().to_owned(),
            Style::default().fg(Color::Rgb(192, 202, 245)),
        ),
    ]);
    f.render_widget(Paragraph::new(prompt), filter_area);
    let cursor_x = filter_area
        .x
        .saturating_add(3)
        .saturating_add(u16::try_from(state.filter().chars().count()).unwrap_or(u16::MAX))
        .min(filter_area.x + filter_area.width.saturating_sub(1));
    f.set_cursor_position((cursor_x, filter_area.y));

    // Separator.
    let sep_area = chunks[1];
    f.render_widget(
        Paragraph::new(Line::from(Span::styled(
            "─".repeat(usize::from(sep_area.width)),
            Style::default().fg(Color::Rgb(78, 92, 122)),
        ))),
        sep_area,
    );

    render_list(f, &entries, state.selected(), chunks[2]);
    f.render_widget(Paragraph::new(footer()), chunks[3]);
}

/// The palette's key-hint footer.
fn footer() -> Line<'static> {
    let key = Style::default()
        .fg(Color::Rgb(192, 202, 245))
        .add_modifier(Modifier::BOLD);
    let dim = Style::default().fg(Color::Rgb(122, 134, 173));
    Line::from(vec![
        Span::raw(" "),
        Span::styled("↑↓", key),
        Span::styled(" navigate  ", dim),
        Span::styled("Enter", key),
        Span::styled(" run  ", dim),
        Span::styled("Esc", key),
        Span::styled(" close", dim),
    ])
}

/// Render the numbered command rows, highlighting the selection. Each row's
/// direct-key shortcut (if any) is shown dimmed as `[…]`, matching the `tasks`
/// shell.
fn render_list(
    f: &mut Frame,
    entries: &[(String, Option<&'static str>)],
    selected: usize,
    area: Rect,
) {
    if entries.is_empty() {
        f.render_widget(
            Paragraph::new(Line::from(Span::styled(
                "  no matches",
                Style::default().fg(Color::Rgb(122, 134, 173)),
            ))),
            area,
        );
        return;
    }
    let active = Style::default()
        .fg(Color::Rgb(255, 199, 119))
        .add_modifier(Modifier::BOLD);
    let inactive = Style::default().fg(Color::Rgb(192, 202, 245));
    // The shortcut hint stays dim regardless of selection — it's metadata, not
    // part of the focused-row emphasis.
    let hint = Style::default().fg(Color::Rgb(122, 134, 173));
    let lines: Vec<Line<'_>> = entries
        .iter()
        .enumerate()
        .map(|(i, (label, shortcut))| {
            let (prefix, style) = if i == selected {
                (" ▎ ", active)
            } else {
                ("   ", inactive)
            };
            let mut spans = vec![
                Span::styled(prefix, style),
                Span::styled(label.clone(), style),
            ];
            if let Some(key) = shortcut {
                spans.push(Span::styled(format!("  [{key}]"), hint));
            }
            Line::from(spans)
        })
        .collect();
    f.render_widget(Paragraph::new(lines), area);
}
