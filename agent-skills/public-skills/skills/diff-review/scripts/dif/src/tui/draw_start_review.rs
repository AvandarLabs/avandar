//! Rendering for the launch-time "start a diff review?" modal.
//!
//! A centered, bordered box over both panes with a Yes / No button row, sharing
//! the palette and help modals' chrome. State and wording live in
//! [`super::start_review`]; key handling lives in `event_loop`.

use ratatui::{
    Frame,
    layout::Rect,
    style::{Color, Modifier, Style},
    text::{Line, Span},
    widgets::{Block, BorderType, Borders, Clear, Paragraph},
};

use super::start_review::{self, Choice, StartReviewModal};

/// Accent colour, matching the other modals' borders and titles.
const ACCENT: Color = Color::Rgb(255, 199, 119);
/// Body text.
const BODY: Color = Color::Rgb(192, 202, 245);
/// Dim text for the hint row.
const DIM: Color = Color::Rgb(122, 134, 173);

/// Render the start-review modal centered over `area`.
pub fn draw_start_review(f: &mut Frame, modal: &StartReviewModal, area: Rect) {
    let mut lines: Vec<Line<'static>> = start_review::body_lines(modal.comparison_label())
        .into_iter()
        .map(|text| Line::from(Span::styled(text, Style::default().fg(BODY))))
        .collect();
    lines.push(Line::default());
    lines.push(button_row(modal.choice()));
    lines.push(Line::default());
    lines.push(Line::from(Span::styled(
        "  y / Enter to start  ·  n / Esc to dismiss  ·  ← → to choose",
        Style::default().fg(DIM),
    )));

    let content_h = u16::try_from(lines.len()).unwrap_or(u16::MAX);
    // borders (2) + a blank row of padding at the top.
    let height = content_h.saturating_add(3).min(area.height);
    let width = 70.min(area.width);
    let modal_area = centered_rect(width, height, area);
    f.render_widget(Clear, modal_area);

    let block = Block::default()
        .borders(Borders::ALL)
        .border_type(BorderType::Rounded)
        .border_style(Style::default().fg(ACCENT))
        .title(Line::from(vec![
            Span::raw(" "),
            Span::styled(
                start_review::title(),
                Style::default().fg(ACCENT).add_modifier(Modifier::BOLD),
            ),
            Span::raw(" "),
        ]));
    let inner = block.inner(modal_area);
    f.render_widget(block, modal_area);
    f.render_widget(Paragraph::new(lines), inner);
}

/// The Yes / No row, with the selected button reversed so the choice is obvious
/// on any terminal theme (not merely a colour difference).
fn button_row(choice: Choice) -> Line<'static> {
    Line::from(vec![
        Span::raw("  "),
        button("Yes", choice == Choice::Yes),
        Span::raw("   "),
        button("No", choice == Choice::No),
    ])
}

fn button(label: &str, selected: bool) -> Span<'static> {
    let text = format!("  {label}  ");
    let style = if selected {
        Style::default()
            .fg(Color::Rgb(26, 27, 38))
            .bg(ACCENT)
            .add_modifier(Modifier::BOLD)
    } else {
        Style::default().fg(DIM)
    };
    Span::styled(text, style)
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn selected_button_is_highlighted_and_the_other_is_not() {
        let yes_row = button_row(Choice::Yes);
        let no_row = button_row(Choice::No);

        // Spans: ["  ", Yes, "   ", No]
        assert_eq!(yes_row.spans[1].style.bg, Some(ACCENT));
        assert_eq!(yes_row.spans[3].style.bg, None);
        assert_eq!(no_row.spans[3].style.bg, Some(ACCENT));
        assert_eq!(no_row.spans[1].style.bg, None);
    }
}
