//! Scrolling and vim motions in the focused markdown pane, and opening the
//! target under the cursor.

use crate::pty_pane::PtyPane;
use crate::tui::guide::Guide;
use crate::tui::main_diff_view::MainDiffView;
use crate::tui::open_target;
use crate::tui::vim::VimMotion;

use super::{App, Panel, half_page_step};

impl App {
    /// Whether a markdown-backed main view is active.
    #[must_use]
    pub fn markdown_view_active(&self) -> bool {
        self.markdown_view_for(self.focus)
    }

    /// Whether `panel` is showing a markdown-backed view (the test plan or the
    /// diff guide) rather than a terminal.
    #[must_use]
    pub fn markdown_view_for(&self, panel: Panel) -> bool {
        panel == Panel::Difit
            && matches!(
                self.active_diff_view,
                MainDiffView::TestPlan | MainDiffView::Guide
            )
    }

    const fn active_markdown(&mut self) -> &mut Guide {
        match self.active_diff_view {
            MainDiffView::TestPlan => &mut self.test_plan,
            _ => &mut self.guide,
        }
    }

    /// The markdown view the main pane is showing (the diff guide unless the
    /// test plan is active).
    pub(super) const fn active_markdown_ref(&self) -> &Guide {
        match self.active_diff_view {
            MainDiffView::TestPlan => &self.test_plan,
            _ => &self.guide,
        }
    }

    /// The PTY behind `panel`, if it exists.
    pub(super) const fn pane_for(&self, panel: Panel) -> Option<&PtyPane> {
        match panel {
            Panel::Difit => Some(&self.difit),
            Panel::Llm => self.llm.as_ref(),
        }
    }

    /// The pane currently focused, if it exists.
    const fn focused_pane(&self) -> Option<&PtyPane> {
        self.pane_for(self.focus)
    }

    /// Scroll `panel` up by `num_rows` rows (mouse wheel over it). In the diff
    /// guide view this moves the cursor (the view follows it); otherwise the
    /// PTY pane scrolls into its history.
    pub fn scroll_panel_up(&mut self, panel: Panel, num_rows: usize) {
        if self.markdown_view_for(panel) {
            self.active_markdown()
                .cursor_up(u16::try_from(num_rows).unwrap_or(u16::MAX));
        } else if let Some(pane) = self.pane_for(panel) {
            pane.scroll_up(num_rows);
        }
    }

    /// Scroll `panel` down by `num_rows` rows (mouse wheel over it).
    pub fn scroll_panel_down(&mut self, panel: Panel, num_rows: usize) {
        if self.markdown_view_for(panel) {
            self.active_markdown()
                .cursor_down(u16::try_from(num_rows).unwrap_or(u16::MAX));
        } else if let Some(pane) = self.pane_for(panel) {
            pane.scroll_down(num_rows);
        }
    }

    /// Scroll the focused pane up by `num_rows` rows (arrows / PageUp / Alt+K).
    pub fn scroll_focused_up(&mut self, num_rows: usize) {
        self.scroll_panel_up(self.focus, num_rows);
    }

    /// Scroll the focused pane down by `num_rows` rows (arrows / PageDown /
    /// Alt+J).
    pub fn scroll_focused_down(&mut self, num_rows: usize) {
        self.scroll_panel_down(self.focus, num_rows);
    }

    /// Scroll the focused view a half-page in `up`'s direction (Alt+U / Alt+D).
    /// The diff guide moves its cursor by a half-page (matching bare `d`/`u`);
    /// a focused PTY pane scrolls its scrollback by half its visible rows.
    /// Intercepted before keys reach the LLM, so it fires while the LLM is
    /// focused too.
    pub fn scroll_focused_half_page(&mut self, up: bool) {
        if self.markdown_view_active() {
            if up {
                self.active_markdown().half_page_up();
            } else {
                self.active_markdown().half_page_down();
            }
        } else if let Some(pane) = self.focused_pane() {
            let step = half_page_step(pane.rows);
            if up {
                pane.scroll_up(step);
            } else {
                pane.scroll_down(step);
            }
        }
    }

    /// Feed a character to the active markdown view's vim navigator and apply
    /// the motion it completes, if any.
    pub fn guide_vim_char(&mut self, c: char) {
        if let Some(motion) = self.vim.feed(c) {
            self.apply_guide_motion(motion);
        }
    }

    /// Apply a completed [`VimMotion`] to the diff guide view.
    fn apply_guide_motion(&mut self, motion: VimMotion) {
        match motion {
            VimMotion::Down(n) => self.active_markdown().cursor_down(n),
            VimMotion::Up(n) => self.active_markdown().cursor_up(n),
            VimMotion::Left(n) => self.active_markdown().cursor_left(n),
            VimMotion::Right(n) => self.active_markdown().cursor_right(n),
            VimMotion::WordForward(n) => self.active_markdown().word_forward(n),
            VimMotion::WordBack(n) => self.active_markdown().word_back(n),
            VimMotion::HalfPageDown => self.active_markdown().half_page_down(),
            VimMotion::HalfPageUp => self.active_markdown().half_page_up(),
            VimMotion::Top => self.active_markdown().to_top(),
            VimMotion::Bottom => self.active_markdown().to_bottom(),
            VimMotion::Open => self.open_under_cursor(),
        }
    }

    /// Open the path/URL under the diff guide's cursor (the `o` key). A no-op
    /// when the cursor isn't on a path/URL token.
    fn open_under_cursor(&self) {
        let target = match self.active_diff_view {
            MainDiffView::TestPlan => self.test_plan.target_under_cursor(),
            _ => self.guide.target_under_cursor(),
        };
        if let Some(target) = target {
            open_target::open(&target, &self.repo_root);
        }
    }
}
