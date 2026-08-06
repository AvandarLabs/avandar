//! Pure builders for launching `dif`'s LLM pane child.
//!
//! `dif` runs one LLM frontend per review, in the repo root, so it operates on
//! the same tree difit is showing. Everything here is pure so it can be
//! unit-tested without a PTY or a real LLM; spawning lives in the TUI layer.
//!
//! Adapted from the `tasks` / `brain` session builders, minus their sqlite
//! session store and SessionStart-hook attribution. `dif` owns exactly one LLM
//! pane for its lifetime, so it needs neither.

use std::path::Path;

/// Which LLM frontend the right pane is running.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AgentKind {
    /// Claude Code.
    Claude,
    /// OpenAI Codex.
    Codex,
}

impl AgentKind {
    /// Human label for UI copy.
    #[must_use]
    pub const fn label(self) -> &'static str {
        match self {
            Self::Claude => "Claude",
            Self::Codex => "Codex",
        }
    }

    /// Whether this frontend supports a `dif`-chosen fresh session id.
    #[must_use]
    pub const fn supports_chosen_session_id(self) -> bool {
        matches!(self, Self::Claude)
    }
}

/// What the LLM pane should launch this run.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Plan {
    /// Resume an existing claude session by id (`claude --resume <id>`).
    Resume(String),
    /// Start a new claude session with a chosen id (`claude --session-id <id>`).
    Fresh(String),
}

impl Plan {
    /// Resume `resume_candidate` when present, otherwise start `new_id` fresh.
    #[must_use]
    pub fn decide(resume_candidate: Option<String>, new_id: String) -> Self {
        resume_candidate.map_or(Self::Fresh(new_id), Self::Resume)
    }
}

/// The message typed (and submitted) into a freshly-started LLM pane.
///
/// It orients the session on the review from the first turn: it states the
/// conversation is about the current diff and hands off to the skill.
pub const INITIAL_REVIEW_PROMPT: &str = "This conversation is about the current diff review in difit. \
     Load the /diff-review skill and use it to drive this review; \
     I'll leave comments in difit as we go.";

/// The prompt to submit into the LLM pane on launch for `plan`.
///
/// A [`Plan::Fresh`] session gets the [`INITIAL_REVIEW_PROMPT`] so it starts
/// already loading the skill; a [`Plan::Resume`] gets nothing, because that
/// orientation is already in the resumed conversation's context (re-injecting
/// it would just repeat work).
#[must_use]
pub const fn initial_prompt(plan: &Plan) -> Option<&'static str> {
    match plan {
        Plan::Fresh(_) => Some(INITIAL_REVIEW_PROMPT),
        Plan::Resume(_) => None,
    }
}

/// Single-quote a string for safe inclusion in a `sh -c` command line.
#[must_use]
pub fn shell_quote(s: &str) -> String {
    let escaped = s.replace('\'', "'\\''");
    format!("'{escaped}'")
}

/// Build the shell command handed to the PTY:
/// `cd <repo_root> && <llm_cmd> ... [<prompt>]`.
///
/// Claude supports `--resume <id>` and `--session-id <id>`, so `dif` can keep
/// its existing resumable-session behavior. Codex supports `codex resume <id>`
/// for existing sessions, but does not expose a flag for `dif` to choose the id
/// of a fresh interactive session, so fresh Codex launches are simply seeded
/// with the initial prompt.
#[must_use]
pub fn build_llm_command(
    repo_root: &Path,
    agent_kind: AgentKind,
    llm_cmd: &str,
    plan: &Plan,
    prompt: Option<&str>,
) -> String {
    let mut parts = vec![
        "cd".to_owned(),
        shell_quote(&repo_root.display().to_string()),
        "&&".to_owned(),
        llm_cmd.trim().to_owned(),
    ];
    match (agent_kind, plan) {
        (AgentKind::Claude, Plan::Resume(id)) => {
            parts.extend(["--resume".to_owned(), shell_quote(id)]);
        }
        (AgentKind::Claude, Plan::Fresh(id)) => {
            parts.extend(["--session-id".to_owned(), shell_quote(id)]);
        }
        (AgentKind::Codex, Plan::Resume(id)) => {
            parts.extend(["resume".to_owned(), shell_quote(id)]);
        }
        (AgentKind::Codex, Plan::Fresh(_)) => {
            // Codex does not provide an option to choose a fresh session id.
        }
    }
    if let Some(p) = prompt {
        let trimmed = p.trim();
        if !trimmed.is_empty() {
            parts.push(shell_quote(trimmed));
        }
    }
    parts.join(" ")
}

/// Claude's project-dir name for a working directory.
///
/// Claude stores a session transcript at
/// `~/.claude/projects/<project-dir-name>/<session-id>.jsonl`, where the name
/// is the cwd with `/` and `.` replaced by `-`. `dif` always runs claude in
/// the repo root, so this names that directory (e.g. `/Users/x/repo` →
/// `-Users-x-repo`). Used to check a session persisted before `--resume`.
#[must_use]
pub fn project_dir_name(repo_root: &Path) -> String {
    repo_root.to_string_lossy().replace(['/', '.'], "-")
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    #[test]
    fn decide_resumes_when_a_candidate_exists() {
        assert_eq!(
            Plan::decide(Some("abc-123".to_owned()), "new-id".to_owned()),
            Plan::Resume("abc-123".to_owned())
        );
    }

    #[test]
    fn decide_starts_fresh_when_nothing_to_resume() {
        assert_eq!(
            Plan::decide(None, "new-id".to_owned()),
            Plan::Fresh("new-id".to_owned())
        );
    }

    #[test]
    fn fresh_command_uses_session_id_flag() {
        let cmd = build_llm_command(
            &PathBuf::from("/Users/x/repo"),
            AgentKind::Claude,
            "claude",
            &Plan::Fresh("uuid-1".to_owned()),
            None,
        );
        assert!(cmd.starts_with("cd '/Users/x/repo' && claude"));
        assert!(cmd.contains("--session-id 'uuid-1'"));
        assert!(!cmd.contains("--resume"));
    }

    #[test]
    fn configured_claude_command_is_spliced_before_session_flags() {
        let cmd = build_llm_command(
            &PathBuf::from("/Users/x/repo"),
            AgentKind::Claude,
            "claude --permission-mode bypassPermissions",
            &Plan::Resume("s".to_owned()),
            None,
        );
        assert_eq!(
            cmd,
            "cd '/Users/x/repo' && claude --permission-mode bypassPermissions --resume 's'"
        );
    }

    #[test]
    fn resume_command_uses_resume_flag() {
        let cmd = build_llm_command(
            &PathBuf::from("/Users/x/repo"),
            AgentKind::Claude,
            "claude",
            &Plan::Resume("sess-9".to_owned()),
            None,
        );
        assert!(cmd.contains("--resume 'sess-9'"));
        assert!(!cmd.contains("--session-id"));
    }

    #[test]
    fn prompt_is_appended_as_a_quoted_arg() {
        let cmd = build_llm_command(
            &PathBuf::from("/Users/x/repo"),
            AgentKind::Claude,
            "claude",
            &Plan::Fresh("uuid-1".to_owned()),
            Some("Address the comment at foo.rs:12"),
        );
        assert!(cmd.ends_with("'Address the comment at foo.rs:12'"));
    }

    #[test]
    fn empty_prompt_adds_no_trailing_arg() {
        let cmd = build_llm_command(
            &PathBuf::from("/Users/x/repo"),
            AgentKind::Claude,
            "claude",
            &Plan::Resume("sess-9".to_owned()),
            Some("   "),
        );
        assert!(cmd.ends_with("--resume 'sess-9'"));
        assert!(!cmd.contains("''"));
    }

    #[test]
    fn prompt_with_a_single_quote_is_escaped() {
        let cmd = build_llm_command(
            &PathBuf::from("/Users/x/repo"),
            AgentKind::Claude,
            "claude",
            &Plan::Fresh("u".to_owned()),
            Some("don't break"),
        );
        assert!(cmd.contains(r"'don'\''t break'"));
    }

    #[test]
    fn fresh_session_gets_the_initial_review_prompt() {
        assert_eq!(
            initial_prompt(&Plan::Fresh("id".to_owned())),
            Some(INITIAL_REVIEW_PROMPT)
        );
    }

    #[test]
    fn resumed_session_gets_no_initial_prompt() {
        assert_eq!(initial_prompt(&Plan::Resume("id".to_owned())), None);
    }

    #[test]
    fn initial_review_prompt_loads_the_skill() {
        assert!(INITIAL_REVIEW_PROMPT.contains("/diff-review"));
        assert!(INITIAL_REVIEW_PROMPT.contains("diff review"));
    }

    #[test]
    fn project_dir_name_mangles_slashes_and_dots() {
        assert_eq!(
            project_dir_name(&PathBuf::from("/Users/x/repo")),
            "-Users-x-repo"
        );
        assert_eq!(
            project_dir_name(&PathBuf::from("/Users/x/.r")),
            "-Users-x--r"
        );
    }

    #[test]
    fn claude_command_uses_configured_base_command() {
        let cmd = build_llm_command(
            &PathBuf::from("/Users/x/repo"),
            AgentKind::Claude,
            "cmddddd",
            &Plan::Resume("sess-9".to_owned()),
            None,
        );
        assert_eq!(cmd, "cd '/Users/x/repo' && cmddddd --resume 'sess-9'");
    }

    #[test]
    fn codex_fresh_command_uses_configured_base_command_without_claude_flags() {
        let cmd = build_llm_command(
            &PathBuf::from("/Users/x/repo"),
            AgentKind::Codex,
            "codex",
            &Plan::Fresh("ignored".to_owned()),
            Some("Review this"),
        );
        assert_eq!(cmd, "cd '/Users/x/repo' && codex 'Review this'");
        assert!(!cmd.contains("--session-id"));
        assert!(!cmd.contains("--resume"));
    }
}
