//! The global command palette: a command registry and its filterable state.
//!
//! `dif`'s palette mirrors the sibling `tasks` / `brain` shells but is far
//! simpler: there is no per-entry context to scope against, so the registry is
//! a flat, ordered table of [`PaletteCommand`]s. Adding a command means adding
//! a row to [`PALETTE_COMMANDS`] and a [`PaletteAction`] variant the
//! `App::execute_palette_action` handler dispatches.

/// An action the palette can dispatch. Each variant maps to one behavior in
/// `App::execute_palette_action`.
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum PaletteAction {
    /// Kill the difit server and relaunch it with the same comparison, port,
    /// and seeded comments, keeping the left pane's log continuous (the new
    /// server output appends below a `[dif]` status line rather than clearing
    /// the pane). Does not touch the claude pane or quit the shell.
    RestartDifit,
    /// Ask claude to regenerate the diff guide for this review (via the
    /// `diff-review` skill), so the diff guide view reflects the current
    /// diff. Injected as a prompt into the claude pane; `dif` does not write the
    /// guide itself.
    RegenerateGuide,
    /// Open the running difit server's URL (`http://localhost:<port>`) in the
    /// system default browser. Does not restart the server.
    OpenInBrowser,
    /// Start a fresh claude session in the claude pane by typing `/new` and
    /// submitting it, so the next prompt is answered in a clean session instead
    /// of the resumed one.
    NewClaudeSession,
}

/// One row in the global command palette.
pub struct PaletteCommand {
    /// The label shown in the palette (after its 1-based number).
    pub label: &'static str,
    /// The action dispatched when the row is selected.
    pub action: PaletteAction,
}

/// The global command registry, in display order. The 1-based number shown
/// next to each command is its position here, so a digit a user types always
/// points at the same command.
pub const PALETTE_COMMANDS: &[PaletteCommand] = &[
    PaletteCommand {
        label: "Restart dif",
        action: PaletteAction::RestartDifit,
    },
    PaletteCommand {
        label: "Regenerate diff guide",
        action: PaletteAction::RegenerateGuide,
    },
    PaletteCommand {
        label: "Open difit in browser",
        action: PaletteAction::OpenInBrowser,
    },
    PaletteCommand {
        label: "New Claude session",
        action: PaletteAction::NewClaudeSession,
    },
];

/// The direct keystroke that runs `action` without opening the palette,
/// rendered as a dimmed `[…]` hint next to its row. `None` for commands with no
/// direct shortcut.
#[must_use]
pub const fn shortcut_for(action: PaletteAction) -> Option<&'static str> {
    match action {
        PaletteAction::RestartDifit => Some("^R"),
        PaletteAction::RegenerateGuide => Some("^D"),
        PaletteAction::OpenInBrowser => Some("^O"),
        PaletteAction::NewClaudeSession => Some("^N"),
    }
}

/// Filterable palette state: the live filter query and the current selection,
/// computed against [`PALETTE_COMMANDS`].
pub struct PaletteState {
    filter: String,
    selected: usize,
}

impl Default for PaletteState {
    fn default() -> Self {
        Self::new()
    }
}

impl PaletteState {
    /// Open the palette with an empty filter and the first command selected.
    #[must_use]
    pub const fn new() -> Self {
        Self {
            filter: String::new(),
            selected: 0,
        }
    }

    /// The palette's title.
    #[must_use]
    pub const fn title(&self) -> &'static str {
        "Command palette"
    }

    /// The stable 1-based number shown next to `cmd`: its position in the full
    /// registry. `0` if the command isn't in the registry (shouldn't happen).
    #[must_use]
    pub fn number_for(&self, cmd: &PaletteCommand) -> usize {
        PALETTE_COMMANDS
            .iter()
            .position(|c| c.action == cmd.action)
            .map_or(0, |i| i + 1)
    }

    /// Commands matching the current filter: a case-insensitive substring over
    /// the numbered, displayed label (`"N. label"`), so users can narrow by
    /// row number or label word.
    #[must_use]
    pub fn visible(&self) -> Vec<&'static PaletteCommand> {
        let q = self.filter.to_lowercase();
        PALETTE_COMMANDS
            .iter()
            .filter(|c| {
                q.is_empty() || {
                    format!("{}. {}", self.number_for(c), c.label)
                        .to_lowercase()
                        .contains(&q)
                }
            })
            .collect()
    }

    /// The rendered rows: each visible command's numbered label (`"N. …"`)
    /// paired with its direct-key shortcut hint, if any.
    #[must_use]
    pub fn numbered_entries(&self) -> Vec<(String, Option<&'static str>)> {
        self.visible()
            .iter()
            .map(|c| {
                (
                    format!("{}. {}", self.number_for(c), c.label),
                    shortcut_for(c.action),
                )
            })
            .collect()
    }

    /// The action of the currently-selected visible command, if any.
    #[must_use]
    pub fn selected_action(&self) -> Option<PaletteAction> {
        self.visible().get(self.selected).map(|c| c.action)
    }

    /// The index of the selected row (for the draw layer).
    #[must_use]
    pub const fn selected(&self) -> usize {
        self.selected
    }

    /// Move the selection down one row, wrapping at the end.
    pub fn move_down(&mut self) {
        let n = self.visible().len();
        if n > 0 {
            self.selected = (self.selected + 1) % n;
        }
    }

    /// Move the selection up one row, wrapping at the top.
    pub fn move_up(&mut self) {
        let n = self.visible().len();
        if n > 0 {
            self.selected = (self.selected + n - 1) % n;
        }
    }

    /// Append a character to the filter and reset the selection to the top.
    pub fn append(&mut self, c: char) {
        self.filter.push(c);
        self.selected = 0;
    }

    /// Delete the last filter character and reset the selection to the top.
    pub fn pop(&mut self) {
        self.filter.pop();
        self.selected = 0;
    }

    /// The current filter query (for the draw layer).
    #[must_use]
    pub fn filter(&self) -> &str {
        &self.filter
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn registry_starts_with_restart_dif() {
        let first = &PALETTE_COMMANDS[0];
        assert_eq!(first.label, "Restart dif");
        assert_eq!(first.action, PaletteAction::RestartDifit);
    }

    #[test]
    fn fresh_palette_selects_the_first_command() {
        let p = PaletteState::new();
        assert_eq!(p.selected_action(), Some(PaletteAction::RestartDifit));
        assert_eq!(
            p.numbered_entries(),
            vec![
                ("1. Restart dif".to_owned(), Some("^R")),
                ("2. Regenerate diff guide".to_owned(), Some("^D")),
                ("3. Open difit in browser".to_owned(), Some("^O")),
                ("4. New Claude session".to_owned(), Some("^N")),
            ]
        );
    }

    #[test]
    fn open_in_browser_advertises_its_ctrl_o_shortcut() {
        assert_eq!(shortcut_for(PaletteAction::OpenInBrowser), Some("^O"));
    }

    #[test]
    fn new_claude_session_advertises_its_ctrl_n_shortcut() {
        assert_eq!(shortcut_for(PaletteAction::NewClaudeSession), Some("^N"));
    }

    #[test]
    fn restart_command_advertises_its_ctrl_r_shortcut() {
        assert_eq!(shortcut_for(PaletteAction::RestartDifit), Some("^R"));
    }

    #[test]
    fn regenerate_guide_advertises_its_ctrl_d_shortcut() {
        assert_eq!(shortcut_for(PaletteAction::RegenerateGuide), Some("^D"));
    }

    #[test]
    fn filter_matches_label_case_insensitively() {
        let mut p = PaletteState::new();
        for c in "RESTART".chars() {
            p.append(c);
        }
        assert_eq!(p.visible().len(), 1);
        assert_eq!(p.selected_action(), Some(PaletteAction::RestartDifit));
    }

    #[test]
    fn filter_matches_the_row_number() {
        let mut p = PaletteState::new();
        p.append('1');
        assert_eq!(p.visible().len(), 1);
    }

    #[test]
    fn non_matching_filter_hides_everything() {
        let mut p = PaletteState::new();
        for c in "zzz".chars() {
            p.append(c);
        }
        assert!(p.visible().is_empty());
        assert_eq!(p.selected_action(), None);
    }

    #[test]
    fn pop_restores_matches_and_resets_selection() {
        let mut p = PaletteState::new();
        for c in "zzz".chars() {
            p.append(c);
        }
        p.pop();
        p.pop();
        p.pop();
        assert_eq!(p.filter(), "");
        assert_eq!(p.selected(), 0);
        assert_eq!(p.selected_action(), Some(PaletteAction::RestartDifit));
    }

    #[test]
    fn navigation_wraps_within_visible() {
        let mut p = PaletteState::new();
        let last = PALETTE_COMMANDS.len() - 1;
        // Up from the top wraps to the last command.
        p.move_up();
        assert_eq!(p.selected(), last);
        // Down from the last wraps back to the top.
        p.move_down();
        assert_eq!(p.selected(), 0);
        // Down advances one row.
        p.move_down();
        assert_eq!(p.selected(), 1);
    }
}
