//! Pure builders for launching `dif`'s `claude` pane child.
//!
//! `dif` runs one resumable `claude` session per review, in the repo root, so
//! claude resolves the repo's `.claude/settings.json` and operates on the same
//! tree difit is showing. Everything here is pure so it can be unit-tested
//! without a PTY or a real claude; spawning lives in the TUI layer.
//!
//! Adapted from the `tasks` / `brain` session builders, minus their sqlite
//! session store and SessionStart-hook attribution — `dif` owns exactly one
//! claude pane for its lifetime, so it needs neither.

use std::path::Path;

/// What the claude pane should launch this run.
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

/// The message typed (and submitted) into a freshly-started claude pane.
///
/// It orients the session on the review from the first turn: it states the
/// conversation is about the current diff and hands off to the skill.
pub const INITIAL_REVIEW_PROMPT: &str =
    "This conversation is about the current diff review in difit. \
     Load the /diff-review skill and use it to drive this review; \
     I'll leave comments in difit as we go.";

/// The prompt to submit into the claude pane on launch for `plan`.
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

/// Options passed to `claude` in the spawned pane. We run `claude`
/// non-interactively (`--dangerously-skip-permissions`) so the injected review
/// comments don't stall on a permission prompt. Adjust here if you want the
/// session to prompt for permissions instead.
const CL_OPTIONS: &[&str] = &["--dangerously-skip-permissions"];

/// Build the shell command handed to the PTY:
/// `cd <repo_root> && claude <cl-options> --resume <id> [<prompt>]` (resume) or
/// `cd <repo_root> && claude <cl-options> --session-id <id> [<prompt>]` (fresh).
///
/// `<cl-options>` mirrors the user's `cl` alias (see [`CL_OPTIONS`]).
///
/// When `prompt` is `Some(non-empty)` it is appended as a single quoted
/// argument so claude submits it on launch and stays interactive.
#[must_use]
pub fn build_claude_command(repo_root: &Path, plan: &Plan, prompt: Option<&str>) -> String {
    let mut parts = vec![
        "cd".to_owned(),
        shell_quote(&repo_root.display().to_string()),
        "&&".to_owned(),
        "claude".to_owned(),
    ];
    for opt in CL_OPTIONS {
        parts.push((*opt).to_owned());
    }
    match plan {
        Plan::Resume(id) => {
            parts.push("--resume".to_owned());
            parts.push(shell_quote(id));
        }
        Plan::Fresh(id) => {
            parts.push("--session-id".to_owned());
            parts.push(shell_quote(id));
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
        let cmd = build_claude_command(
            &PathBuf::from("/Users/x/repo"),
            &Plan::Fresh("uuid-1".to_owned()),
            None,
        );
        assert!(cmd.starts_with("cd '/Users/x/repo' && claude"));
        assert!(cmd.contains("--dangerously-skip-permissions"));
        assert!(cmd.contains("--session-id 'uuid-1'"));
        assert!(!cmd.contains("--resume"));
    }

    #[test]
    fn command_carries_the_cl_options() {
        let cmd = build_claude_command(
            &PathBuf::from("/Users/x/repo"),
            &Plan::Resume("s".to_owned()),
            None,
        );
        for opt in CL_OPTIONS {
            assert!(cmd.contains(opt), "missing cl option {opt}");
        }
    }

    #[test]
    fn resume_command_uses_resume_flag() {
        let cmd = build_claude_command(
            &PathBuf::from("/Users/x/repo"),
            &Plan::Resume("sess-9".to_owned()),
            None,
        );
        assert!(cmd.contains("--resume 'sess-9'"));
        assert!(!cmd.contains("--session-id"));
    }

    #[test]
    fn prompt_is_appended_as_a_quoted_arg() {
        let cmd = build_claude_command(
            &PathBuf::from("/Users/x/repo"),
            &Plan::Fresh("uuid-1".to_owned()),
            Some("Address the comment at foo.rs:12"),
        );
        assert!(cmd.ends_with("'Address the comment at foo.rs:12'"));
    }

    #[test]
    fn empty_prompt_adds_no_trailing_arg() {
        let cmd = build_claude_command(
            &PathBuf::from("/Users/x/repo"),
            &Plan::Resume("sess-9".to_owned()),
            Some("   "),
        );
        assert!(cmd.ends_with("--resume 'sess-9'"));
        assert!(!cmd.contains("''"));
    }

    #[test]
    fn prompt_with_a_single_quote_is_escaped() {
        let cmd = build_claude_command(
            &PathBuf::from("/Users/x/repo"),
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
        assert_eq!(project_dir_name(&PathBuf::from("/Users/x/repo")), "-Users-x-repo");
        assert_eq!(project_dir_name(&PathBuf::from("/Users/x/.r")), "-Users-x--r");
    }
}
