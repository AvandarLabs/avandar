//! The LLM pane's launch command: resume a remembered Claude session when its
//! transcript still exists, otherwise start a fresh one, never seeding a review.

use std::fs;
use std::path::{Path, PathBuf};

use crate::pty_pane::PtyPane;
use crate::session::{self, AgentKind, Plan};

use super::{INITIAL_COLS, INITIAL_ROWS};

/// Spawn the LLM pane, resuming the saved session when possible.
///
/// Nothing is typed into it either way. A launch is not a request to review:
/// `dif`'s job on startup is to show the diff, and a review only begins when the
/// reviewer asks for one (the start-review modal, or `/diff-review` typed by
/// hand). A resumed session keeps whatever context it already had.
pub(super) fn spawn_llm(
    repo_root: &Path,
    session_id_path: &Path,
    agent_kind: AgentKind,
    llm_cmd: &str,
) -> Option<PtyPane> {
    let command = launch_llm_command(
        repo_root,
        session_id_path,
        agent_kind,
        llm_cmd,
        resume_candidate(repo_root, session_id_path, agent_kind),
    );
    PtyPane::spawn_shell_command_with_env(&command, &[], repo_root, INITIAL_ROWS, INITIAL_COLS).ok()
}

/// The shell command a launch uses for the LLM pane: `resume_id`'s session when
/// there is one to resume, otherwise a fresh session, and in both cases with no
/// prompt submitted on startup.
///
/// Split from [`spawn_llm`] so the choice is testable without a PTY. Passing a
/// prompt here would make `dif` commission a review merely by being launched,
/// which is the reviewer's decision to make.
fn launch_llm_command(
    repo_root: &Path,
    session_id_path: &Path,
    agent_kind: AgentKind,
    llm_cmd: &str,
    resume_id: Option<String>,
) -> String {
    resume_id.map_or_else(
        || fresh_llm_command_with_prompt(repo_root, session_id_path, agent_kind, llm_cmd, None),
        |id| session::build_llm_command(repo_root, agent_kind, llm_cmd, &Plan::Resume(id), None),
    )
}

/// Mint a fresh LLM session and return the shell command that launches it.
///
/// Generates a new session id, persists it to `session_id_path` (so a later
/// `dif` launch can `--resume` this session), and builds the launch command with
/// the review-orientation prompt auto-submitted on startup. This is the `Ctrl+N`
/// respawn path ([`App::new_llm_session`](super::app::App::new_llm_session)); a
/// first launch goes through [`launch_llm_command`] instead and submits nothing.
pub fn fresh_llm_command(
    repo_root: &Path,
    session_id_path: &Path,
    agent_kind: AgentKind,
    llm_cmd: &str,
) -> String {
    fresh_llm_command_with_prompt(
        repo_root,
        session_id_path,
        agent_kind,
        llm_cmd,
        session::initial_prompt(&Plan::Fresh(String::new())),
    )
}

/// Mint a fresh LLM session with a caller-provided first prompt.
pub fn fresh_llm_command_with_prompt(
    repo_root: &Path,
    session_id_path: &Path,
    agent_kind: AgentKind,
    llm_cmd: &str,
    prompt: Option<&str>,
) -> String {
    let id = uuid::Uuid::new_v4().to_string();
    if agent_kind.supports_chosen_session_id() {
        let _ = fs::write(session_id_path, &id);
    }
    let plan = Plan::Fresh(id);
    session::build_llm_command(repo_root, agent_kind, llm_cmd, &plan, prompt)
}

/// Prompt used when no matching `.difit` review artifacts exist yet.
pub fn prepare_review_prompt(comparison_arg: Option<&str>) -> String {
    comparison_arg.map_or_else(
        || "/diff-review".to_owned(),
        |arg| format!("/diff-review {}", arg.trim()),
    )
}

/// The saved session id, but only if the selected frontend can resume it.
fn resume_candidate(
    repo_root: &Path,
    session_id_path: &Path,
    agent_kind: AgentKind,
) -> Option<String> {
    let id = fs::read_to_string(session_id_path).ok()?.trim().to_owned();
    if id.is_empty() {
        return None;
    }
    match agent_kind {
        AgentKind::Claude => session_transcript_exists(repo_root, &id).then_some(id),
        AgentKind::Codex => Some(id),
    }
}

/// Whether `~/.claude/projects/<project-dir>/<id>.jsonl` exists.
fn session_transcript_exists(repo_root: &Path, id: &str) -> bool {
    let Some(home) = std::env::var_os("HOME") else {
        return false;
    };
    PathBuf::from(home)
        .join(".claude")
        .join("projects")
        .join(session::project_dir_name(repo_root))
        .join(format!("{id}.jsonl"))
        .is_file()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::session;

    #[test]
    fn fresh_llm_command_persists_claude_id_and_seeds_the_prompt() {
        let dir = tempfile::tempdir().expect("tempdir");
        let session_id_path = dir.path().join("session-id");

        let command = fresh_llm_command(dir.path(), &session_id_path, AgentKind::Claude, "claude");

        // The id is persisted so a later `dif` launch can `--resume` it...
        let id = fs::read_to_string(&session_id_path).expect("id written");
        assert!(!id.trim().is_empty(), "a fresh id must be written");
        // ...the launch command starts that exact fresh session...
        assert!(command.contains("--session-id"), "launches a fresh session");
        assert!(command.contains(id.trim()), "launches the persisted id");
        // ...already oriented on the review (the initial prompt is submitted).
        assert!(command.contains("/diff-review"), "seeds the review prompt");
    }

    #[test]
    fn fresh_llm_command_mints_a_distinct_claude_id_each_call() {
        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir.path().join("session-id");

        let _ = fresh_llm_command(dir.path(), &path, AgentKind::Claude, "claude");
        let first = fs::read_to_string(&path).expect("first id");
        let _ = fresh_llm_command(dir.path(), &path, AgentKind::Claude, "claude");
        let second = fs::read_to_string(&path).expect("second id");

        assert_ne!(first, second, "each Ctrl+N respawn is a distinct session");
    }

    #[test]
    fn fresh_llm_command_does_not_persist_codex_id() {
        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir.path().join("session-id");

        let command = fresh_llm_command(dir.path(), &path, AgentKind::Codex, "codex");

        assert!(!path.exists(), "codex does not accept a chosen fresh id");
        assert!(command.contains("codex"));
        assert!(command.contains("/diff-review"));
        assert!(!command.contains("--session-id"));
    }

    #[test]
    fn a_launch_seeds_no_prompt_whether_it_resumes_or_starts_fresh() {
        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir.path().join("session-id");

        let fresh = launch_llm_command(dir.path(), &path, AgentKind::Claude, "claude", None);
        let resumed = launch_llm_command(
            dir.path(),
            &path,
            AgentKind::Claude,
            "claude",
            Some("session-to-resume".to_owned()),
        );

        assert!(fresh.contains("--session-id"), "fresh: {fresh}");
        assert!(resumed.contains("--resume"), "resumed: {resumed}");
        // Neither branch may commission a review: that is the reviewer's call,
        // made in the start-review modal.
        for command in [&fresh, &resumed] {
            assert!(
                !command.contains("/diff-review"),
                "a launch must not kick off a review: {command}"
            );
            assert!(
                !command.contains(session::INITIAL_REVIEW_PROMPT),
                "a launch must not inject the orientation prompt either: {command}"
            );
        }
    }

    #[test]
    fn prepare_review_prompt_uses_only_the_user_comparison_arg() {
        assert_eq!(prepare_review_prompt(None), "/diff-review");
        assert_eq!(prepare_review_prompt(Some(".")), "/diff-review .");
        assert_eq!(
            prepare_review_prompt(Some("develop")),
            "/diff-review develop"
        );
    }

    #[test]
    fn prepare_llm_command_seeds_slash_command_not_review_chat_prompt() {
        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir.path().join("session-id");
        let prompt = prepare_review_prompt(Some("."));

        let command = fresh_llm_command_with_prompt(
            dir.path(),
            &path,
            AgentKind::Claude,
            "claude",
            Some(prompt.as_str()),
        );

        assert!(command.contains("/diff-review ."));
        assert!(!command.contains(session::INITIAL_REVIEW_PROMPT));
    }
}
