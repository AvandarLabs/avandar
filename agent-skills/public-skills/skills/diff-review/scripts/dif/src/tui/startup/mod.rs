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
use std::sync::Arc;
use std::time::Duration;

use anyhow::Result;

use crate::cli::Cli;
use crate::comparison::ComparisonKey;
use crate::config::DifConfig;
use crate::difit::poller::Poller;
use crate::difit::server;
use crate::git::{self, Git};
use crate::git_watcher::GitWatcher;
use crate::github::registry::SharedRegistry;
use crate::inject::dispatcher::Dispatcher;
use crate::inject::mode::DispatchControl;
use crate::inject::reply_watcher::ReplyWatcher;
use crate::paths;
use crate::pty_pane::PtyPane;
use crate::session::AgentKind;
use crate::slug;
use crate::web;

use super::app::{App, Panel};
use super::control::ReviewControl;
use super::guide::Guide;
use super::main_diff_view::MainDiffView;
use super::start_review::StartReviewModal;
use super::vim::VimState;

mod llm_command;
mod surface;

use llm_command::spawn_llm;
pub(crate) use llm_command::{
    fresh_llm_command, fresh_llm_command_with_prompt, prepare_review_prompt,
};
use surface::start_launch_surface;
pub(crate) use surface::start_poller;

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
    github_sync: PathBuf,
}

/// Everything a launch resolves before starting anything: the repository,
/// the LLM to run, the comparison under review, its ports, and its files.
struct LaunchTarget {
    repo_root: PathBuf,
    agent_kind: AgentKind,
    llm_cmd: String,
    host: String,
    branch: String,
    worktree: String,
    comparison: ComparisonKey,
    port: u16,
    shell_port: u16,
    control_port: u16,
    review_paths: ReviewPaths,
}

/// Launch the LLM and, when review artifacts already exist, difit + poller.
pub fn launch(cli: &Cli) -> Result<App> {
    let target = resolve_launch_target(cli)?;
    let review_control = ReviewControl::start(target.control_port)?;
    let guide_ready = review_files_ready(
        &target.review_paths.transcript,
        &target.review_paths.guide,
        &target.review_paths.guide_json,
    );
    // The skill may still retarget the comparison while it prepares the guide;
    // once a guide exists the comparison is settled and updates are refused.
    review_control.set_accepts_updates(!guide_ready);
    let comment_channels = web::CommentChannels {
        dispatch: Arc::new(DispatchControl::new()),
        github: SharedRegistry::load(target.review_paths.github_sync.clone()),
    };
    let surface = start_launch_surface(&target, &comment_channels)?;

    // `dif` never starts a review by itself. The LLM pane opens idle; when no
    // review is prepared, the modal below asks, and only a Yes injects anything.
    let start_review = (!guide_ready).then(|| {
        StartReviewModal::new(
            prepare_review_prompt(cli.comparison_key.as_deref()),
            comparison_label(&target.comparison),
        )
    });
    let open_url = surface.open_url.clone();
    let app = create_app(
        target,
        surface,
        review_control,
        comment_channels,
        start_review,
    );
    app.write_session_meta(Some(open_url));
    if !guide_ready {
        app.difit
            .write_to_screen(&preparing_notice(&app.comparison_label));
    }
    Ok(app)
}

/// Resolve the repository, LLM, comparison, ports, and review files for a
/// launch, creating the `.difit/` directory the review files live in.
fn resolve_launch_target(cli: &Cli) -> Result<LaunchTarget> {
    let repo_root = git::repo_root()?;
    let config = DifConfig::load(&repo_root);
    let (agent_kind, llm_cmd) = selected_agent(cli, config);
    let branch = git::current_branch()?;
    let comparison = git::resolve_comparison_key(cli.comparison_key.as_deref(), &Git);

    let branch_slug = slug::branch_slug(&branch);
    let scope_slug = comparison.scope_slug();
    let port_for_role = |role: &str| {
        server::pick_port(slug::port_for(&format!("{branch_slug}{role}"), &scope_slug))
    };
    let port = server::pick_port(slug::port_for(&branch_slug, &scope_slug));
    let shell_port = port_for_role("-shell");
    let control_port = port_for_role("-control");
    let review_paths = review_paths(&repo_root, agent_kind, &branch_slug, &scope_slug);
    let _ = fs::create_dir_all(paths::difit_dir(&repo_root));
    Ok(LaunchTarget {
        worktree: web::meta::worktree_name(&repo_root, &branch),
        repo_root,
        agent_kind,
        llm_cmd,
        host: cli.host.clone(),
        branch,
        comparison,
        port,
        shell_port,
        control_port,
        review_paths,
    })
}

/// The launched [`App`]: the started surface and LLM pane, with every other
/// piece of state at its initial value.
fn create_app(
    target: LaunchTarget,
    surface: LaunchSurface,
    review_control: ReviewControl,
    comment_channels: web::CommentChannels,
    start_review: Option<StartReviewModal>,
) -> App {
    App {
        llm: spawn_llm(
            &target.repo_root,
            &target.review_paths.session_id,
            target.agent_kind,
            &target.llm_cmd,
        ),
        git_watcher: GitWatcher::start(target.repo_root.clone(), Duration::from_secs(1)),
        served_sig: git::diff_signature(&target.repo_root),
        guide_ready: start_review.is_none(),
        difit: surface.difit,
        agent_kind: target.agent_kind,
        llm_cmd: target.llm_cmd,
        focus: initial_focus(),
        port: target.port,
        difit_host: target.host,
        comparison_label: comparison_label(&target.comparison),
        repo_root: target.repo_root,
        comparison: target.comparison,
        transcript_path: target.review_paths.transcript,
        session_id_path: target.review_paths.session_id,
        review_control,
        dispatcher: Dispatcher::new(),
        comment_channels,
        reply_watcher: ReplyWatcher::new(),
        poller: Some(surface.poller),
        pending_change: None,
        warned_sig: None,
        last_inject_at: None,
        active_diff_view: MainDiffView::Log,
        guide: Guide::new(target.review_paths.guide),
        test_plan: Guide::new(target.review_paths.test_plan.clone()),
        vim: VimState::new(),
        session_meta: target.review_paths.session_meta,
        palette: None,
        help_open: false,
        web_shell: surface.web_shell,
        open_url: Some(surface.open_url),
        shell_port: target.shell_port,
        control_port: target.control_port,
        guide_json_path: target.review_paths.guide_json,
        diff_summary_path: target.review_paths.diff_summary,
        test_plan_path: target.review_paths.test_plan,
        branch: target.branch,
        worktree: target.worktree,
        start_review,
        should_quit: false,
    }
}

/// The banner shown in the difit pane when the diff is live but no review has
/// been prepared. Says the diff is fully usable as-is, and how to start a review
/// if the modal was dismissed (nothing runs one automatically).
fn preparing_notice(comparison_label: &str) -> String {
    format!(
        "\r\n\x1b[36m[dif] No prepared diff review for {comparison_label}: the diff is live anyway.\x1b[0m\r\n\
         \x1b[36m[dif] Nothing is generating a review: answer Yes in the prompt, or run /diff-review in the LLM pane yourself.\x1b[0m\r\n\
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
        github_sync: paths::github_sync_path(repo_root, branch_slug, scope_slug),
    }
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

/// A short human label for the comparison, e.g. `@ develop` or `.`.
pub(crate) fn comparison_label(comparison: &ComparisonKey) -> String {
    comparison.difit_args().join(" ")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn preparing_notice_does_not_claim_a_review_is_running() {
        let notice = preparing_notice("@ develop");

        assert!(notice.contains("@ develop"), "names the comparison");
        assert!(notice.contains("the diff is live"));
        // Nothing runs a review on its own, so the banner must not claim one is
        // under way; it must say how to start one instead.
        // The contract, not the wording: the notice must tell the reviewer how
        // to start a review, since nothing starts one for them.
        assert!(notice.contains("/diff-review"));
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
}
