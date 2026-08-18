//! Rendering for the launch-time "start a diff review?" modal.
//!
//! A centred, bordered box over both panes with a Yes / No button row, sharing
//! the palette and help modals' chrome and their placement helper. State and
//! wording live in [`modal`](super::modal); key handling in
//! [`keys`](super::keys).

use ratatui::{
    Frame,
    layout::Rect,
    style::{Color, Modifier, Style},
    text::{Line, Span},
    widgets::{Block, BorderType, Borders, Clear, Paragraph, Wrap},
};

use super::modal::{self, Choice, StartReviewModal};
use crate::tui::modal_layout::centered_rect;

/// Accent colour, matching the other modals' borders and titles.
const ACCENT: Color = Color::Rgb(255, 199, 119);
/// Body text.
const BODY: Color = Color::Rgb(192, 202, 245);
/// Dim text for the hint row and the unselected button.
const DIM: Color = Color::Rgb(122, 134, 173);
/// Ink used on top of the accent fill of the selected button.
const ON_ACCENT: Color = Color::Rgb(26, 27, 38);
/// Left indent shared by every row, so the modal's text lines up.
const INDENT: &str = "  ";
/// Modal width before clamping to the terminal.
const WIDTH: u16 = 70;

/// Render the start-review modal centred over `area`.
pub fn draw_start_review(f: &mut Frame, start_review_modal: &StartReviewModal, area: Rect) {
    let lines = build_lines(start_review_modal);
    // Wrapping can push the body past its line count, so reserve the borders
    // (2), the leading padding row, and a little slack for a wrapped sentence.
    let content_height = u16::try_from(lines.len()).unwrap_or(u16::MAX);
    let height = content_height.saturating_add(5).min(area.height);
    let modal_area = centered_rect(WIDTH, height, area);
    f.render_widget(Clear, modal_area);

    let block = Block::default()
        .borders(Borders::ALL)
        .border_type(BorderType::Rounded)
        .border_style(Style::default().fg(ACCENT))
        .title(Line::from(vec![
            Span::raw(" "),
            Span::styled(
                modal::title(),
                Style::default().fg(ACCENT).add_modifier(Modifier::BOLD),
            ),
            Span::raw(" "),
        ]));
    let inner = block.inner(modal_area);
    f.render_widget(block, modal_area);
    // Wrapped, not pre-wrapped: an unbounded comparison label or a narrow
    // terminal must reflow rather than truncate the sentence naming the diff.
    f.render_widget(
        Paragraph::new(lines).wrap(Wrap { trim: false }),
        inner,
    );
}

/// The modal's rows: a padding row, the body, the buttons, then the key hints.
fn build_lines(start_review_modal: &StartReviewModal) -> Vec<Line<'static>> {
    let body = modal::body_lines()
        .into_iter()
        .map(|text| {
            Line::from(vec![
                Span::raw(INDENT),
                Span::styled(text, Style::default().fg(BODY)),
            ])
        });

    [Line::default()]
        .into_iter()
        .chain(body)
        .chain([
            Line::default(),
            button_row(start_review_modal.choice()),
            Line::default(),
            Line::from(vec![
                Span::raw(INDENT),
                Span::styled(
                    "y / Enter to start  ·  n / Esc to dismiss  ·  left / right to choose",
                    Style::default().fg(DIM),
                ),
            ]),
        ])
        .collect()
}

/// The Yes / No row. The selected button is filled and bold while the other is
/// dim, so the choice reads on any terminal theme and not by hue alone.
fn button_row(choice: Choice) -> Line<'static> {
    Line::from(vec![
        Span::raw(INDENT),
        button("Yes", choice == Choice::Yes),
        Span::raw("   "),
        button("No", choice == Choice::No),
    ])
}

fn button(label: &str, selected: bool) -> Span<'static> {
    let text = format!("  {label}  ");
    let style = if selected {
        Style::default()
            .fg(ON_ACCENT)
            .bg(ACCENT)
            .add_modifier(Modifier::BOLD)
    } else {
        Style::default().fg(DIM)
    };
    Span::styled(text, style)
}

#[cfg(test)]
mod tests {
    use super::*;

    /// The rendered style of the button whose label contains `label`.
    fn button_style(choice: Choice, label: &str) -> Style {
        button_row(choice)
            .spans
            .iter()
            .find(|span| span.content.contains(label))
            .expect("the row renders both buttons")
            .style
    }

    #[test]
    fn exactly_the_selected_button_is_emphasised() {
        // Emphasis is asserted as "differs from the unselected style and is
        // bold", not as a specific colour, so a theme change does not break the
        // test and a lost highlight does not pass it.
        for (choice, selected, unselected) in [
            (Choice::Yes, "Yes", "No"),
            (Choice::No, "No", "Yes"),
        ] {
            let selected_style = button_style(choice, selected);
            let unselected_style = button_style(choice, unselected);

            assert_ne!(
                selected_style, unselected_style,
                "{selected} must render differently from {unselected}"
            );
            assert!(
                selected_style.add_modifier.contains(Modifier::BOLD),
                "the selected button must be emphasised, not only recoloured"
            );
            assert!(
                !unselected_style.add_modifier.contains(Modifier::BOLD),
                "the unselected button must not be emphasised"
            );
        }
    }

    #[test]
    fn every_row_shares_the_same_left_indent() {
        let lines = build_lines(&StartReviewModal::new(
            "/diff-review".to_owned(),
            "@ develop".to_owned(),
        ));

        let indents: Vec<String> = lines
            .iter()
            .filter(|line| !line.spans.is_empty())
            .map(|line| {
                line.spans
                    .first()
                    .map(|span| span.content.to_string())
                    .unwrap_or_default()
            })
            .collect();

        assert!(
            !indents.is_empty(),
            "the modal renders at least one row of content"
        );
        assert!(
            indents.iter().all(|indent| indent == INDENT),
            "body, buttons, and hints must all start at the same column"
        );
    }
}
