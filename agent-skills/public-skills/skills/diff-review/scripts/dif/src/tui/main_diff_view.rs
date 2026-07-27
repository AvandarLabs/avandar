//! Which view is showing in the main diff pane (the left half of the shell).
//!
//! The shell is split into the **main view** (the left "diff view") and the
//! agent pane (the right). The main view itself shows one of three things at a
//! time: the **log view** (difit's server console), the **test plan view**, or
//! the **diff guide view** (the rendered review guide). `Tab` / `Shift+Tab`
//! cycle between them.
//! Mirrors the `tasks` crate's `View` cycle.

/// The view currently shown in the main diff pane.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MainDiffView {
    /// The difit server console (URL, requests, status, `dif` alerts).
    Log,
    /// The manual test plan markdown.
    TestPlan,
    /// The rendered diff guide markdown.
    Guide,
}

impl MainDiffView {
    /// All views in `Tab` order.
    pub const CYCLE: [Self; 3] = [Self::Log, Self::TestPlan, Self::Guide];

    /// The next view in the cycle, wrapping at the end.
    #[must_use]
    pub fn next(self) -> Self {
        let n = Self::CYCLE.len();
        let i = Self::CYCLE.iter().position(|v| *v == self).unwrap_or(0);
        Self::CYCLE[(i + 1) % n]
    }

    /// The previous view in the cycle, wrapping at the front.
    #[must_use]
    pub fn prev(self) -> Self {
        let n = Self::CYCLE.len();
        let i = Self::CYCLE.iter().position(|v| *v == self).unwrap_or(0);
        Self::CYCLE[(i + n - 1) % n]
    }

    /// The label shown in the main view's tab strip.
    #[must_use]
    pub const fn label(self) -> &'static str {
        match self {
            Self::Log => "Logs",
            Self::TestPlan => "Test plan",
            Self::Guide => "Diff guide",
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn tab_cycles_forward_and_wraps() {
        assert_eq!(MainDiffView::Log.next(), MainDiffView::TestPlan);
        assert_eq!(MainDiffView::TestPlan.next(), MainDiffView::Guide);
        assert_eq!(MainDiffView::Guide.next(), MainDiffView::Log);
    }

    #[test]
    fn shift_tab_cycles_backward_and_wraps() {
        assert_eq!(MainDiffView::Guide.prev(), MainDiffView::TestPlan);
        assert_eq!(MainDiffView::TestPlan.prev(), MainDiffView::Log);
        assert_eq!(MainDiffView::Log.prev(), MainDiffView::Guide);
    }

    #[test]
    fn labels_match_the_vocabulary() {
        assert_eq!(MainDiffView::Log.label(), "Logs");
        assert_eq!(MainDiffView::TestPlan.label(), "Test plan");
        assert_eq!(MainDiffView::Guide.label(), "Diff guide");
    }
}
