//! Rendering the two halves of the shell: the main diff pane on the left, the
//! agent pane on the right.
//!
//! The main diff pane carries a one-row tab strip. Its log view is difit's
//! `vt100` console via `tui-term`; markdown-backed views render the test plan
//! or diff guide through [`super::markdown`]. The agent pane is its own PTY.
//! The focused pane's border brightens and (for a PTY) its cursor is surfaced.

use ratatui::Frame;
use ratatui::layout::{Alignment, Constraint, Layout, Rect};
use ratatui::style::{Color, Modifier, Style};
use ratatui::text::{Line, Span};
use ratatui::widgets::{Block, Borders, Paragraph, Wrap};
use tui_term::widget::PseudoTerminal;

use crate::pty_pane::PtyPane;
use crate::session::AgentKind;

use super::app::{App, Panel};
use super::main_diff_view::MainDiffView;
use super::shortcuts::{self, Group};

/// Draw the whole UI for one frame.
pub fn draw(f: &mut Frame, app: &mut App) {
    // Reserve the bottom row for the keyboard-shortcut statusline.
    let root = Layout::vertical([Constraint::Min(0), Constraint::Length(1)]).split(f.area());
    let cols =
        Layout::horizontal([Constraint::Percentage(50), Constraint::Percentage(50)]).split(root[0]);
    draw_main_diff(f, cols[0], app);
    draw_llm(f, cols[1], app);
    draw_statusline(f, root[1]);
    // The command palette and help modal overlay both panes when open; drawn
    // last so their borders and cursor sit on top. Only one is ever open.
    if let Some(palette) = app.palette.as_ref() {
        super::draw_palette::draw_palette(f, palette, f.area());
    }
    if app.help_open {
        super::draw_help::draw_help(f, f.area());
    }
    // The start-review question owns the screen while it is open: it is asked at
    // launch and captures every key, so it draws above the other overlays.
    if let Some(modal) = app.start_review.as_ref() {
        super::start_review::draw_start_review(f, modal, f.area());
    }
}

/// The bottom keyboard-shortcut statusline: the curated command chips on the
/// left, and the `Alt+S` help hint pinned to the far right so it always shows.
fn draw_statusline(f: &mut Frame, area: Rect) {
    let key = Style::new()
        .fg(Color::Rgb(255, 199, 119))
        .add_modifier(Modifier::BOLD);
    let lbl = Style::new().fg(Color::Rgb(154, 165, 199));
    let sep = Style::new().fg(Color::Rgb(78, 92, 122));

    let mut left = vec![Span::raw(" ")];
    let mut first = true;
    for s in shortcuts::footer_subset()
        .into_iter()
        .filter(|s| s.group != Group::Global)
    {
        if !first {
            left.push(Span::styled("  ·  ", sep));
        }
        first = false;
        left.push(Span::styled(s.keys, key));
        left.push(Span::raw(" "));
        left.push(Span::styled(s.label, lbl));
    }

    // The Global-group chip (Alt+S) pinned right.
    let mut right = Vec::new();
    for s in shortcuts::footer_subset()
        .into_iter()
        .filter(|s| s.group == Group::Global)
    {
        right.push(Span::styled(s.keys, key));
        right.push(Span::raw(" "));
        right.push(Span::styled(s.label, lbl));
        right.push(Span::raw(" "));
    }

    let split = Layout::horizontal([Constraint::Min(0), Constraint::Length(20)]).split(area);
    f.render_widget(Paragraph::new(Line::from(left)), split[0]);
    f.render_widget(
        Paragraph::new(Line::from(right)).alignment(Alignment::Right),
        split[1],
    );
}

/// Draw the main diff pane: a tab strip plus the active view (log or guide).
fn draw_main_diff(f: &mut Frame, area: Rect, app: &mut App) {
    let focused = app.focus == Panel::Difit;
    // difit is live from launch; "preparing guide" marks the review artifacts
    // the LLM has not written yet, not the diff.
    let title = if app.guide_ready {
        format!(" difit · {} · :{} (alt+h) ", app.comparison_label, app.port)
    } else {
        format!(
            " difit · {} · :{} · preparing guide (alt+h) ",
            app.comparison_label, app.port
        )
    };
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
        MainDiffView::TestPlan => draw_markdown_view(
            f,
            rows[1],
            &mut app.test_plan,
            "No test plan yet.",
            "Press Ctrl+G to ask the LLM to generate one.",
        ),
        MainDiffView::Guide => draw_markdown_view(
            f,
            rows[1],
            &mut app.guide,
            "No diff guide yet.",
            "Press Ctrl+G to ask the LLM to generate one.",
        ),
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

/// Draw a markdown-backed main view.
fn draw_markdown_view(
    f: &mut Frame,
    area: Rect,
    doc: &mut super::guide::Guide,
    empty_title: &'static str,
    empty_hint: &'static str,
) {
    if area.height == 0 || area.width == 0 {
        return;
    }
    let Some(md) = doc.text() else {
        let hint = Style::default().fg(Color::Rgb(122, 134, 173));
        f.render_widget(
            Paragraph::new(vec![
                Line::default(),
                Line::from(Span::styled(format!("  {empty_title}"), hint)),
                Line::from(Span::styled(format!("  {empty_hint}"), hint)),
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
        .map(|l| {
            l.spans
                .iter()
                .map(|s| s.content.as_ref())
                .collect::<String>()
        })
        .collect();
    doc.set_lines(lines);
    doc.set_viewport(area.height, area.width);
    let (vscroll, hscroll) = doc.scroll();
    f.render_widget(Paragraph::new(text).scroll((vscroll, hscroll)), area);
    if let Some(pos) = doc.cursor_screen_pos((area.x, area.y)) {
        f.set_cursor_position(pos);
    }
}

fn draw_llm(f: &mut Frame, area: Rect, app: &mut App) {
    let focused = app.focus == Panel::Llm;
    if let Some(llm) = app.llm.as_mut() {
        let title = llm_title(app.agent_kind);
        render_pane(f, area, &title, llm, focused);
    } else {
        let title = llm_session_ended_title(app.agent_kind);
        let block = bordered(&title, focused);
        f.render_widget(
            Paragraph::new("\n  The LLM session has ended.\n  Press ^Q to quit dif.")
                .block(block)
                .wrap(Wrap { trim: false }),
            area,
        );
    }
}

fn llm_title(agent_kind: AgentKind) -> String {
    format!(" {} (alt+l) · ^P cmds · ^Q quit ", agent_kind.label())
}

fn llm_session_ended_title(agent_kind: AgentKind) -> String {
    format!(" {} session ended ", agent_kind.label())
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

#[cfg(test)]
mod tests {
    use crate::session::AgentKind;

    use super::{llm_session_ended_title, llm_title};

    #[test]
    fn llm_title_uses_agent_label_without_internal_nomenclature() {
        assert_eq!(
            llm_title(AgentKind::Claude),
            " Claude (alt+l) · ^P cmds · ^Q quit "
        );
        assert_eq!(
            llm_title(AgentKind::Codex),
            " Codex (alt+l) · ^P cmds · ^Q quit "
        );
        assert!(!llm_title(AgentKind::Claude).contains("LLM panel"));
    }

    #[test]
    fn ended_title_uses_agent_label_without_internal_nomenclature() {
        assert_eq!(
            llm_session_ended_title(AgentKind::Claude),
            " Claude session ended "
        );
        assert_eq!(
            llm_session_ended_title(AgentKind::Codex),
            " Codex session ended "
        );
        assert!(!llm_session_ended_title(AgentKind::Codex).contains("LLM panel"));
    }
}
