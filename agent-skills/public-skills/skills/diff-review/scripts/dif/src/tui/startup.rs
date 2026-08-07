//! Bringing a review online: resolve the comparison, start difit and the
//! browser shell, spawn the LLM, and assemble the [`App`].
//!
//! **The diff never waits on the LLM.** difit only needs git, so a launch with
//! no prepared review still opens the browser immediately: the transcript is
//! created empty, difit serves the diff, and the poller starts. The guide,
//! summary, test plan, and `claude` threads land later — the browser shell
//! polls them in, and the poller imports the skill's threads into the live
//! server (see [`importer`](crate::difit::importer)). Comments the reviewer
//! writes in the meantime are mirrored and queued to the LLM like any other.
//!
//! Claude sessions are resumable across `dif` launches: we remember the id in
//! `.difit/.claude-session-<branch>-<scope>` and `--resume` it when its
//! transcript still exists on disk. Codex launches are supported too, but the
//! current Codex CLI does not let `dif` choose the id for a fresh session.

use std::fs;
use std::path::{Path, PathBuf};
use std::time::Duration;

use anyhow::Result;

use crate::cli::Cli;
use crate::comparison::ComparisonKey;
use crate::config::DifConfig;
use crate::difit::poller::Poller;
use crate::difit::{server, transcript};
use crate::git::{self, Git};
use crate::git_watcher::GitWatcher;
use crate::inject::dispatcher::Dispatcher;
use crate::inject::reply_watcher::ReplyWatcher;
use crate::paths;
use crate::pty_pane::PtyPane;
use crate::session::{self, AgentKind, Plan};
use crate::slug;
use crate::web;

use super::app::{App, Panel};
use super::control::ReviewControl;

/// Placeholder PTY size; the first draw resizes both panes to the real layout.
const INITIAL_ROWS: u16 = 24;
/// Placeholder PTY columns.
const INITIAL_COLS: u16 = 80;

struct LaunchSurface {
    difit: PtyPane,
    poller: Poller,
    web_shell: Option<web::WebShell>,
    open_url: String,
}

struct ReviewPaths {
    transcript: PathBuf,
    session_id: PathBuf,
    session_meta: PathBuf,
    guide: PathBuf,
    guide_json: PathBuf,
    diff_summary: PathBuf,
    test_plan: PathBuf,
}

/// Launch the LLM and, when review artifacts already exist, difit + poller.
pub fn launch(cli: &Cli) -> Result<App> {
    let repo_root = git::repo_root()?;
    let config = DifConfig::load(&repo_root);
    let (agent_kind, llm_cmd) = selected_agent(cli, config);
    let branch = git::current_branch()?;
    let comparison = git::resolve_comparison_key(cli.comparison_key.as_deref(), &Git);

    let branch_slug = slug::branch_slug(&branch);
    let scope_slug = comparison.scope_slug();
    let port = server::pick_port(slug::port_for(&branch_slug, &scope_slug));
    let review_paths = review_paths(&repo_root, agent_kind, &branch_slug, &scope_slug);
    let _ = fs::create_dir_all(paths::difit_dir(&repo_root));

    let shell_port =
        server::pick_port(slug::port_for(&format!("{branch_slug}-shell"), &scope_slug));
    let control_port = server::pick_port(slug::port_for(
        &format!("{branch_slug}-control"),
        &scope_slug,
    ));
    let review_control = ReviewControl::start(control_port)?;
    let guide_ready = review_files_ready(
        &review_paths.transcript,
        &review_paths.guide,
        &review_paths.guide_json,
    );
    // The skill may still retarget the comparison while it prepares the guide;
    // once a guide exists the comparison is settled and updates are refused.
    review_control.set_accepts_updates(!guide_ready);
    let worktree = web::meta::worktree_name(&repo_root, &branch);
    let surface = start_launch_surface(
        &repo_root,
        &comparison,
        port,
        &cli.host,
        shell_port,
        &review_paths,
        branch.clone(),
        worktree.clone(),
    )?;

    let initial_prompt =
        (!guide_ready).then(|| prepare_review_prompt(cli.comparison_key.as_deref()));
    let llm = spawn_llm(
        &repo_root,
        &review_paths.session_id,
        agent_kind,
        &llm_cmd,
        initial_prompt.as_deref(),
    );
    let git_watcher = GitWatcher::start(repo_root.clone(), Duration::from_secs(1));
    let served_sig = git::diff_signature(&repo_root);
    let dispatcher = Dispatcher::new();

    let open_url = surface.open_url.clone();
    let app = App {
        difit: surface.difit,
        llm,
        agent_kind,
        llm_cmd,
        focus: initial_focus(),
        port,
        difit_host: cli.host.clone(),
        comparison_label: comparison_label(&comparison),
        repo_root,
        comparison,
        transcript_path: review_paths.transcript,
        session_id_path: review_paths.session_id,
        review_control,
        dispatcher,
        reply_watcher: ReplyWatcher::new(),
        poller: Some(surface.poller),
        git_watcher,
        served_sig,
        pending_change: None,
        warned_sig: None,
        last_inject_at: None,
        active_diff_view: super::main_diff_view::MainDiffView::Log,
        guide: super::guide::Guide::new(review_paths.guide),
        test_plan: super::guide::Guide::new(review_paths.test_plan.clone()),
        vim: super::vim::VimState::new(),
        session_meta: review_paths.session_meta,
        palette: None,
        help_open: false,
        web_shell: surface.web_shell,
        open_url: Some(surface.open_url),
        guide_ready,
        shell_port,
        control_port,
        guide_json_path: review_paths.guide_json,
        diff_summary_path: review_paths.diff_summary,
        test_plan_path: review_paths.test_plan,
        branch,
        worktree,
        fresh_llm_prompt: initial_prompt,
        should_quit: false,
    };
    app.write_session_meta(Some(open_url));
    if !guide_ready {
        app.difit.write_to_screen(&preparing_notice(&app.comparison_label));
    }
    Ok(app)
}

/// The banner shown in the difit pane when the diff is live but the review
/// artifacts are not written yet. Sets the expectation that reviewing can start
/// now and the guide will appear around it.
fn preparing_notice(comparison_label: &str) -> String {
    format!(
        "\r\n\x1b[36m[dif] No prepared diff review for {comparison_label} — the diff is live anyway.\x1b[0m\r\n\
         \x1b[36m[dif] The LLM is running /diff-review; the guide, summary, and comments fill in as it writes them.\x1b[0m\r\n\
         \x1b[36m[dif] Comment now if you like: your comments are saved and queued to the LLM.\x1b[0m\r\n"
    )
}

/// The initial keyboard focus for a new TUI launch.
const fn initial_focus() -> Panel {
    Panel::Llm
}

fn selected_agent(cli: &Cli, config: DifConfig) -> (AgentKind, String) {
    if cli.codex {
        (AgentKind::Codex, config.codex_cmd)
    } else {
        (AgentKind::Claude, config.claude_cmd)
    }
}

fn review_paths(
    repo_root: &Path,
    agent_kind: AgentKind,
    branch_slug: &str,
    scope_slug: &str,
) -> ReviewPaths {
    ReviewPaths {
        transcript: paths::transcript_path(repo_root, branch_slug, scope_slug),
        session_id: paths::llm_session_id_path(repo_root, agent_kind, branch_slug, scope_slug),
        session_meta: paths::session_meta_path(repo_root, branch_slug, scope_slug),
        guide: paths::guide_path(repo_root, branch_slug, scope_slug),
        guide_json: paths::guide_json_path(repo_root, branch_slug, scope_slug),
        diff_summary: paths::diff_summary_path(repo_root, branch_slug, scope_slug),
        test_plan: paths::test_plan_path(repo_root, branch_slug, scope_slug),
    }
}

/// Start difit, the poller, and the browser shell, and open the review.
///
/// Nothing here waits on difit answering: the shell binds and serves its page
/// straight away and its iframe retries until difit is up, so the browser opens
/// as fast as it can be told to. The poller idles harmlessly until its first
/// successful fetch.
#[allow(clippy::too_many_arguments)]
fn start_launch_surface(
    repo_root: &Path,
    comparison: &ComparisonKey,
    port: u16,
    host: &str,
    shell_port: u16,
    review_paths: &ReviewPaths,
    branch: String,
    worktree: String,
) -> Result<LaunchSurface> {
    // The transcript is the review's canonical file, and the reviewer can start
    // commenting before any review exists, so it must exist before difit does.
    let _ = transcript::ensure_exists(&review_paths.transcript);
    let transcript_raw = transcript::read_raw(&review_paths.transcript);
    let difit = server::spawn(
        repo_root,
        comparison,
        port,
        host,
        transcript_raw.as_deref(),
        false,
        INITIAL_ROWS,
        INITIAL_COLS,
    )?;
    let web_shell = start_web_shell(
        port,
        shell_port,
        review_paths.guide_json.clone(),
        branch,
        worktree,
        review_paths.diff_summary.clone(),
        review_paths.test_plan.clone(),
    );
    let open_url = web_shell
        .as_ref()
        .map_or_else(|| format!("http://localhost:{port}/"), web::WebShell::url);
    super::open_target::open_url(&open_url);
    Ok(LaunchSurface {
        difit,
        poller: Poller::start(
            port,
            review_paths.transcript.clone(),
            Duration::from_secs(1),
        ),
        web_shell,
        open_url,
    })
}

/// Spawn the LLM pane, resuming the saved session when possible.
fn spawn_llm(
    repo_root: &Path,
    session_id_path: &Path,
    agent_kind: AgentKind,
    llm_cmd: &str,
    fresh_prompt_override: Option<&str>,
) -> Option<PtyPane> {
    let resume_id = if fresh_prompt_override.is_some() {
        None
    } else {
        resume_candidate(repo_root, session_id_path, agent_kind)
    };
    let command = resume_id.map_or_else(
        || {
            fresh_llm_command_with_prompt(
                repo_root,
                session_id_path,
                agent_kind,
                llm_cmd,
                fresh_prompt_override,
            )
        },
        |id| {
            // A resumed session already carries the review context.
            let plan = Plan::Resume(id);
            session::build_llm_command(
                repo_root,
                agent_kind,
                llm_cmd,
                &plan,
                session::initial_prompt(&plan),
            )
        },
    );
    PtyPane::spawn_shell_command_with_env(&command, &[], repo_root, INITIAL_ROWS, INITIAL_COLS).ok()
}

/// Mint a fresh LLM session and return the shell command that launches it.
///
/// Generates a new session id, persists it to `session_id_path` (so a later
/// `dif` launch can `--resume` this session), and builds the launch command
/// with the initial review prompt auto-submitted on startup. Shared by the
/// pane's first launch ([`spawn_llm`]) and the `Ctrl+N` respawn
/// ([`App::new_llm_session`](super::app::App::new_llm_session)) so both
/// start a fresh session identically.
pub(crate) fn fresh_llm_command(
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
pub(crate) fn fresh_llm_command_with_prompt(
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
pub(crate) fn prepare_review_prompt(comparison_arg: Option<&str>) -> String {
    comparison_arg.map_or_else(
        || "/diff-review".to_owned(),
        |arg| format!("/diff-review {}", arg.trim()),
    )
}

/// Whether the prepared review artifacts exist for the selected comparison.
///
/// This no longer gates difit — the diff is served either way — it gates the
/// *review*: whether to seed `/diff-review` into the LLM and whether the skill
/// may still retarget the comparison. A transcript alone is not enough: `dif`
/// creates an empty one at launch, so both guides must be present too.
pub(crate) fn review_files_ready(
    transcript_path: &Path,
    guide_path: &Path,
    guide_json_path: &Path,
) -> bool {
    transcript_path.is_file() && guide_path.is_file() && guide_json_path.is_file()
}

fn start_web_shell(
    port: u16,
    shell_port: u16,
    guide_json_path: PathBuf,
    branch: String,
    worktree: String,
    diff_summary_path: PathBuf,
    test_plan_path: PathBuf,
) -> Option<web::WebShell> {
    // Wrap difit in the browser web shell (guide sidebar + per-group filtered
    // views). If the shell fails to start, callers fall back to raw difit.
    web::WebShell::start(
        port,
        shell_port,
        guide_json_path,
        branch,
        worktree,
        diff_summary_path,
        test_plan_path,
    )
    .ok()
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

/// A short human label for the comparison, e.g. `@ develop` or `.`.
pub(crate) fn comparison_label(comparison: &ComparisonKey) -> String {
    comparison.difit_args().join(" ")
}

#[cfg(test)]
mod tests {
    use super::*;

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
    fn prepare_review_prompt_uses_only_the_user_comparison_arg() {
        assert_eq!(prepare_review_prompt(None), "/diff-review");
        assert_eq!(prepare_review_prompt(Some(".")), "/diff-review .");
        assert_eq!(
            prepare_review_prompt(Some("develop")),
            "/diff-review develop"
        );
    }

    #[test]
    fn review_files_ready_waits_for_transcript_and_guides() {
        let dir = tempfile::tempdir().expect("tempdir");
        let transcript_path = dir.path().join("review.json");
        let guide_path = dir.path().join("review-guide.md");
        let guide_json_path = dir.path().join("review-guide.json");

        assert!(!review_files_ready(
            &transcript_path,
            &guide_path,
            &guide_json_path
        ));

        fs::write(&transcript_path, "[]").expect("write transcript");
        fs::write(&guide_path, "# guide").expect("write guide");
        assert!(!review_files_ready(
            &transcript_path,
            &guide_path,
            &guide_json_path
        ));

        fs::write(&guide_json_path, "[]").expect("write structured guide");
        assert!(review_files_ready(
            &transcript_path,
            &guide_path,
            &guide_json_path
        ));
    }

    #[test]
    fn initial_focus_starts_on_llm_panel() {
        assert_eq!(initial_focus(), Panel::Llm);
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
