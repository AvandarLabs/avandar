//! The single source of truth for the terminal TUI's keybindings.
//!
//! Both the compact statusline (a curated subset, those flagged `in_footer`)
//! and the `Alt+S` help modal (everything, grouped) render from [`ALL`]. The key
//! *handling* lives in `event_loop` / `keymap`; this table is the human-facing
//! catalogue, so when a binding changes, update its row here and both surfaces
//! follow. Mirrors the sibling `brain`/`tasks` shortcuts model.
//!
//! Keep `keys` short — it's what shows in the statusline chip. `label` is the
//! one-word caption; `desc` is the fuller sentence the help modal uses.

/// Which surface a shortcut belongs to. Drives the grouping in the help modal.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Group {
    Focus,
    Commands,
    MainView,
    DiffGuide,
    Global,
}

impl Group {
    /// Section heading shown in the help modal, in display order.
    #[must_use]
    pub const fn title(self) -> &'static str {
        match self {
            Self::Focus => "Focus & scroll",
            Self::Commands => "Commands",
            Self::MainView => "Main (diff) view",
            Self::DiffGuide => "Diff guide (vim pager)",
            Self::Global => "Global",
        }
    }

    /// Groups in the order the help modal lists them.
    pub const ORDER: [Self; 5] = [
        Self::Focus,
        Self::Commands,
        Self::MainView,
        Self::DiffGuide,
        Self::Global,
    ];
}

/// One keybinding row.
#[derive(Debug, Clone, Copy)]
pub struct Shortcut {
    /// Display form of the key(s), e.g. `"Tab / ⇧Tab"`, `"^G"`, `"Alt+S"`.
    pub keys: &'static str,
    /// One-word caption for the compact statusline.
    pub label: &'static str,
    /// Fuller description shown in the help modal.
    pub desc: &'static str,
    /// Which surface this belongs to.
    pub group: Group,
    /// Whether the compact statusline shows this binding.
    pub in_footer: bool,
}

/// Every keybinding, in a stable order.
///
/// The help modal renders these grouped by [`Group::ORDER`]; the statusline
/// renders the `in_footer` subset. `Alt+S` (help) is intentionally last so it
/// renders at the end of the statusline.
pub const ALL: &[Shortcut] = &[
    // --- Focus & scroll ---
    Shortcut { keys: "Alt+H / Alt+L", label: "focus", desc: "Focus the left diff view / the right Claude pane", group: Group::Focus, in_footer: false },
    Shortcut { keys: "Alt+U / Alt+D", label: "scroll", desc: "Scroll the focused view a half-page up / down (works even while Claude is focused)", group: Group::Focus, in_footer: false },
    // --- Commands (from either pane) ---
    Shortcut { keys: "^P", label: "palette", desc: "Open the command palette", group: Group::Commands, in_footer: true },
    Shortcut { keys: "^G", label: "guide", desc: "Regenerate the diff guide (ask Claude)", group: Group::Commands, in_footer: true },
    Shortcut { keys: "^O", label: "browser", desc: "Open the review in the browser web shell", group: Group::Commands, in_footer: true },
    Shortcut { keys: "^R", label: "restart", desc: "Restart the difit server", group: Group::Commands, in_footer: false },
    Shortcut { keys: "^N", label: "new session", desc: "Start a fresh Claude session (auto-submits the review prompt)", group: Group::Commands, in_footer: false },
    Shortcut { keys: "^Q", label: "quit", desc: "Quit dif (tears down difit, Claude, and the poller)", group: Group::Commands, in_footer: true },
    // --- Main (diff) view ---
    Shortcut { keys: "Tab / ⇧Tab", label: "view", desc: "Cycle the main view (Logs ↔ Diff guide)", group: Group::MainView, in_footer: true },
    Shortcut { keys: "↑ / ↓", label: "scroll", desc: "Scroll the active view 3 rows", group: Group::MainView, in_footer: false },
    Shortcut { keys: "PgUp / PgDn", label: "page", desc: "Scroll the active view a page", group: Group::MainView, in_footer: false },
    // --- Diff guide (vim pager) ---
    Shortcut { keys: "j / k", label: "line", desc: "Move the cursor down / up a line (accepts a count, e.g. 3j)", group: Group::DiffGuide, in_footer: false },
    Shortcut { keys: "h / l", label: "col", desc: "Move the cursor left / right a column", group: Group::DiffGuide, in_footer: false },
    Shortcut { keys: "w / b", label: "word", desc: "Move the cursor forward / back a word", group: Group::DiffGuide, in_footer: false },
    Shortcut { keys: "d / u", label: "½-page", desc: "Scroll the guide down / up a half-page", group: Group::DiffGuide, in_footer: false },
    Shortcut { keys: "gg / G", label: "ends", desc: "Jump to the top / bottom of the guide", group: Group::DiffGuide, in_footer: false },
    Shortcut { keys: "o", label: "open", desc: "Open the file path or URL under the cursor", group: Group::DiffGuide, in_footer: false },
    // --- Global (rendered at the end of the statusline) ---
    Shortcut { keys: "Alt+S", label: "shortcuts", desc: "Show all keyboard shortcuts (this modal)", group: Group::Global, in_footer: true },
];

/// The curated subset rendered in the compact statusline (those flagged
/// `in_footer`), in table order. `Alt+S` is last.
#[must_use]
pub fn footer_subset() -> Vec<&'static Shortcut> {
    ALL.iter().filter(|s| s.in_footer).collect()
}

/// Shortcuts belonging to `group`, in table order. Used by the help modal.
#[must_use]
pub fn in_group(group: Group) -> Vec<&'static Shortcut> {
    ALL.iter().filter(|s| s.group == group).collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn footer_subset_is_nonempty_and_all_flagged() {
        let subset = footer_subset();
        assert!(!subset.is_empty());
        assert!(subset.iter().all(|s| s.in_footer));
    }

    #[test]
    fn every_shortcut_lands_in_exactly_one_ordered_group() {
        let total: usize = Group::ORDER.iter().map(|g| in_group(*g).len()).sum();
        assert_eq!(total, ALL.len());
    }

    #[test]
    fn help_is_advertised_as_alt_s_and_renders_last_in_the_statusline() {
        // Alt+S opens the modal and is the final statusline chip, per the ask.
        assert!(ALL.iter().any(|s| s.keys == "Alt+S" && s.desc.contains("shortcuts")));
        assert_eq!(footer_subset().last().map(|s| s.keys), Some("Alt+S"));
    }

    #[test]
    fn commands_group_lists_the_web_shell_open() {
        let cmds = in_group(Group::Commands);
        assert!(cmds.iter().any(|s| s.keys == "^O" && s.desc.contains("web shell")));
    }
}
