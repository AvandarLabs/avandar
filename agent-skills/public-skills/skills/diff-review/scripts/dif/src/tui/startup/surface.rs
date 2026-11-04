//! Starting the review surface: difit, its transcript poller, and the
//! browser web shell.

use std::path::{Path, PathBuf};
use std::time::Duration;

use anyhow::Result;

use crate::comparison::ComparisonKey;
use crate::difit::editor::DifitHttp;
use crate::difit::poller::Poller;
use crate::difit::{server, transcript};
use crate::github::checkout::GitCheckout;
use crate::github::client::GhCli;
use crate::github::registry::SharedRegistry;
use crate::github::sync::{GithubSync, SyncPorts};
use crate::tui::open_target;
use crate::web;

use super::{INITIAL_COLS, INITIAL_ROWS, LaunchSurface, LaunchTarget};

/// Start difit, the poller, and the browser shell, and open the review.
///
/// Nothing here waits on difit answering: the shell binds and serves its page
/// straight away and its iframe retries until difit is up, so the browser opens
/// as fast as it can be told to. The poller idles harmlessly until its first
/// successful fetch.
pub(super) fn start_launch_surface(
    target: &LaunchTarget,
    comment_channels: &web::CommentChannels,
) -> Result<LaunchSurface> {
    let review_paths = &target.review_paths;
    // The transcript is the review's canonical file, and the reviewer can start
    // commenting before any review exists, so it must exist before difit does.
    let _ = transcript::ensure_exists(&review_paths.transcript);
    let transcript_raw = transcript::read_raw(&review_paths.transcript);
    let difit = server::spawn(
        &target.repo_root,
        &target.comparison,
        target.port,
        &target.host,
        transcript_raw.as_deref(),
        false,
        INITIAL_ROWS,
        INITIAL_COLS,
    )?;
    let web_shell = start_web_shell(target, comment_channels);
    let open_url = web_shell.as_ref().map_or_else(
        || format!("http://localhost:{}/", target.port),
        web::WebShell::url,
    );
    open_target::open_url(&open_url);
    Ok(LaunchSurface {
        difit,
        poller: start_poller(
            &target.repo_root,
            &target.comparison,
            target.port,
            review_paths.transcript.clone(),
            &comment_channels.github,
        ),
        web_shell,
        open_url,
    })
}

/// Start the comments poller on `port`, with the GitHub sync pass that keeps
/// `github`'s PR comments, the checkout, and difit in step with the PR.
pub fn start_poller(
    repo_root: &Path,
    comparison: &ComparisonKey,
    port: u16,
    transcript_path: PathBuf,
    github: &SharedRegistry,
) -> Poller {
    let ports = SyncPorts {
        api: Box::new(GhCli::new(repo_root.to_path_buf())),
        checkout: Box::new(GitCheckout::new(repo_root.to_path_buf())),
        editor: Box::new(DifitHttp { port }),
    };
    let sync = GithubSync::new(github.clone(), comparison.clone(), ports);
    Poller::start_with_github(port, transcript_path, Duration::from_secs(1), Some(sync))
}

#[allow(clippy::too_many_arguments)]
fn start_web_shell(
    target: &LaunchTarget,
    comment_channels: &web::CommentChannels,
) -> Option<web::WebShell> {
    // Wrap difit in the browser web shell (guide sidebar + per-group filtered
    // views). If the shell fails to start, callers fall back to raw difit.
    web::WebShell::start(
        target.port,
        target.shell_port,
        target.review_paths.guide_json.clone(),
        target.branch.clone(),
        target.worktree.clone(),
        target.review_paths.diff_summary.clone(),
        target.review_paths.test_plan.clone(),
        comment_channels.clone(),
    )
    .ok()
}
