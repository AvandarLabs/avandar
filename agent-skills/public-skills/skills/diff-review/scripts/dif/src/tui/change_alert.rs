//! Wording for the "code changed: restart difit" alert shown in the log view.
//!
//! When the repo's diff signature diverges from what difit is serving, `dif`
//! warns that a restart is needed. Best-effort attribution distinguishes a
//! change the LLM just made (it was injected a prompt moments ago) from a manual
//! edit made outside the shell, so the alert can name the author. The decision
//! is a pure function of "how long since `dif` last injected a prompt", which
//! keeps it unit-testable without touching `Instant`.

use std::time::Duration;

/// Who most likely made the code change difit is now stale against.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ChangeAuthor {
    /// `dif` injected a prompt into the LLM shortly before the change settled,
    /// so the agent almost certainly made the edit.
    Claude,
    /// No recent injection: the change came from outside the shell.
    Manual,
}

/// Attribute a settled code change.
///
/// `since_last_inject` is how long ago `dif` last typed a prompt into the LLM
/// (`None` if it never has this session); a change within `window` of an
/// injection is credited to the agent.
#[must_use]
pub fn change_author(since_last_inject: Option<Duration>, window: Duration) -> ChangeAuthor {
    match since_last_inject {
        Some(elapsed) if elapsed <= window => ChangeAuthor::Claude,
        _ => ChangeAuthor::Manual,
    }
}

/// The orange, ANSI-wrapped alert line (CR/LF-padded) for the log view, worded
/// by `author` and ready to hand to `PtyPane::write_to_screen`.
#[must_use]
pub fn change_alert(author: ChangeAuthor) -> String {
    change_alert_for(author, "Claude")
}

/// The alert line using the active LLM frontend's display label.
#[must_use]
pub fn change_alert_for(author: ChangeAuthor, agent_label: &str) -> String {
    let body = match author {
        ChangeAuthor::Claude => {
            format!("⚠️  {agent_label} made code changes. Restart difit to show them (Ctrl+R) 🔁")
        }
        ChangeAuthor::Manual => {
            "⚠️  New manual changes detected. Restart difit to show them (Ctrl+R) 🔁".to_owned()
        }
    };
    format!("\r\n\x1b[1;38;5;208m{body}\x1b[0m\r\n")
}

#[cfg(test)]
mod tests {
    use super::*;

    const WINDOW: Duration = Duration::from_secs(120);

    #[test]
    fn recent_injection_is_attributed_to_claude() {
        assert_eq!(
            change_author(Some(Duration::from_secs(5)), WINDOW),
            ChangeAuthor::Claude
        );
    }

    #[test]
    fn stale_injection_is_treated_as_manual() {
        assert_eq!(
            change_author(Some(Duration::from_secs(600)), WINDOW),
            ChangeAuthor::Manual
        );
    }

    #[test]
    fn no_injection_is_manual() {
        assert_eq!(change_author(None, WINDOW), ChangeAuthor::Manual);
    }

    #[test]
    fn alert_wording_names_the_author() {
        assert!(change_alert(ChangeAuthor::Claude).contains("Claude made"));
        assert!(change_alert(ChangeAuthor::Manual).contains("manual changes"));
        // Both still tell the reviewer how to refresh.
        assert!(change_alert(ChangeAuthor::Claude).contains("Ctrl+R"));
        assert!(change_alert(ChangeAuthor::Manual).contains("Ctrl+R"));
    }

    #[test]
    fn alert_wording_uses_selected_agent_label() {
        assert!(change_alert_for(ChangeAuthor::Claude, "Codex").contains("Codex made"));
    }
}
