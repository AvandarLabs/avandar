//! Rendering the two halves of the shell: the main diff pane on the left, the
//! claude panel on the right.
//!
//! The main diff pane carries a one-row tab strip (the **log view** and the
//! **diff guide view**) and shows one of them: the log view is difit's `vt100`
//! console via `tui-term`; the diff guide view is the guide markdown rendered
//! by [`super::markdown`]. The claude panel is its own PTY. The focused pane's
//! border brightens and (for a PTY) its cursor is surfaced.

use ratatui::Frame;
use ratatui::layout::{Constraint, Layout, Rect};
use ratatui::style::{Color, Modifier, Style};
use ratatui::text::{Line, Span};
use ratatui::widgets::{Block, Borders, Paragraph, Wrap};
use tui_term::widget::PseudoTerminal;

use crate::pty_pane::PtyPane;

use super::app::{App, Panel};
use super::main_diff_view::MainDiffView;

/// Draw the whole UI for one frame.
pub fn draw(f: &mut Frame, app: &mut App) {
    let cols =
        Layout::horizontal([Constraint::Percentage(50), Constraint::Percentage(50)]).split(f.area());
    draw_main_diff(f, cols[0], app);
    draw_claude(f, cols[1], app);
    // The command palette overlays both panes when open; drawn last so its
    // border and cursor sit on top.
    if let Some(palette) = app.palette.as_ref() {
        super::draw_palette::draw_palette(f, palette, f.area());
    }
}

/// Draw the main diff pane: a tab strip plus the active view (log or guide).
fn draw_main_diff(f: &mut Frame, area: Rect, app: &mut App) {
    let focused = app.focus == Panel::Difit;
    let title = format!(" difit · {} · :{} (alt+h) ", app.comparison_label, app.port);
    let block = bordered(&title, focused);
    let inner = block.inner(area);
    f.render_widget(block, area);
    if inner.height == 0 || inner.width == 0 {
        return;
    }
    let rows = Layout::vertical([Constraint::Length(1), Constraint::Min(0)]).split(inner);
    f.render_widget(Paragraph::new(tab_strip(app.active_diff_view)), rows[0]);

    match app.active_diff_view {
        MainDiffView::Log => draw_log_view(f, rows[1], &mut app.difit, focused),
        MainDiffView::Guide => draw_guide_view(f, rows[1], app),
    }
}

/// The `view · Logs · Diff guide` strip, active view bold. Mirrors `tasks`.
fn tab_strip(active: MainDiffView) -> Line<'static> {
    let dim = Style::new().fg(Color::Rgb(122, 134, 173));
    let mut spans = vec![Span::raw(" "), Span::styled("view · ", dim)];
    for (i, v) in MainDiffView::CYCLE.iter().enumerate() {
        if i > 0 {
            spans.push(Span::styled(" · ", dim));
        }
        let style = if *v == active {
            Style::new()
                .fg(Color::Rgb(255, 199, 119))
                .add_modifier(Modifier::BOLD)
        } else {
            dim
        };
        spans.push(Span::styled(v.label(), style));
    }
    spans.push(Span::styled("   (tab)", dim));
    Line::from(spans)
}

/// The log view: difit's `vt100` screen, resized to its area.
fn draw_log_view(f: &mut Frame, area: Rect, pane: &mut PtyPane, focused: bool) {
    if area.height == 0 || area.width == 0 {
        return;
    }
    pane.resize(area.height, area.width);
    if let Ok(parser) = pane.parser.read() {
        let screen = parser.screen();
        f.render_widget(PseudoTerminal::new(screen), area);
        if focused && pane.is_alive() && !screen.hide_cursor() {
            let (row, col) = screen.cursor_position();
            f.set_cursor_position((area.x.saturating_add(col), area.y.saturating_add(row)));
        }
    }
}

/// The diff guide view: the guide markdown rendered, scrolled, and clamped to
/// the content height. An absent guide shows a hint to generate one.
fn draw_guide_view(f: &mut Frame, area: Rect, app: &mut App) {
    if area.height == 0 || area.width == 0 {
        return;
    }
    let Some(md) = app.guide.text() else {
        let hint = Style::default().fg(Color::Rgb(122, 134, 173));
        f.render_widget(
            Paragraph::new(vec![
                Line::default(),
                Line::from(Span::styled("  No diff guide yet.", hint)),
                Line::from(Span::styled(
                    "  Press Ctrl+D to ask Claude to generate one.",
                    hint,
                )),
            ]),
            area,
        );
        return;
    };
    // Render the markdown to styled (colored) lines and draw them. The guide
    // tracks a cursor over the same lines; we hand it the plain text so it can
    // clamp the cursor / move by word, derive the scroll that keeps the cursor
    // visible, then paint a real terminal block cursor at it.
    let text = super::markdown::render(md, area.width);
    let lines: Vec<String> = text
        .lines
        .iter()
        .map(|l| l.spans.iter().map(|s| s.content.as_ref()).collect::<String>())
        .collect();
    app.guide.set_lines(lines);
    app.guide.set_viewport(area.height, area.width);
    let (vscroll, hscroll) = app.guide.scroll();
    f.render_widget(Paragraph::new(text).scroll((vscroll, hscroll)), area);
    if let Some(pos) = app.guide.cursor_screen_pos((area.x, area.y)) {
        f.set_cursor_position(pos);
    }
}

fn draw_claude(f: &mut Frame, area: Rect, app: &mut App) {
    let focused = app.focus == Panel::Claude;
    if let Some(claude) = app.claude.as_mut() {
        render_pane(f, area, " Claude (alt+l) · ^P cmds · ^Q quit ", claude, focused);
    } else {
        let block = bordered(" Claude · session ended ", focused);
        f.render_widget(
            Paragraph::new("\n  The claude session has ended.\n  Press ^Q to quit dif.")
                .block(block)
                .wrap(Wrap { trim: false }),
            area,
        );
    }
}

/// Render one PTY pane inside a bordered block, resizing the PTY to fit.
fn render_pane(f: &mut Frame, area: Rect, title: &str, pane: &mut PtyPane, focused: bool) {
    let block = bordered(title, focused);
    let inner = block.inner(area);
    f.render_widget(block, area);
    draw_log_view(f, inner, pane, focused);
}

/// A bordered block whose border brightens when focused.
fn bordered(title: &str, focused: bool) -> Block<'_> {
    let border_style = if focused {
        Style::default().fg(Color::Cyan)
    } else {
        Style::default().fg(Color::DarkGray)
    };
    Block::default()
        .borders(Borders::ALL)
        .border_style(border_style)
        .title(title)
}
