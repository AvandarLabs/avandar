//! The GitHub sync pass, run on the poller thread for every difit snapshot so
//! `gh` calls never block the TUI.
//!
//! Each tick it:
//!   1. looks the PR up (once, then again every pull interval while there is
//!      none, so a PR opened mid-session is found);
//!   2. pushes the reviewer's PR comment changes ([`plan`](super::plan)) into
//!      their pending review;
//!   3. sends viewed-file changes the browser queued;
//!   4. submits the pending review when the browser asks
//!      ([`sync_submit`](super::sync_submit));
//!   5. pulls from GitHub every minute, or at once when asked
//!      ([`sync_pull`](super::sync_pull)).
//!
//! While GitHub cannot be reached ([`connection`](super::connection)) the steps
//! make no calls and every interaction stays queued
//! ([`sync_queue`](super::sync_queue)); the first call that cannot reach
//! GitHub stops the rest of the pass.

use std::time::{Duration, Instant};

use anyhow::{Result, anyhow};

use crate::comparison::ComparisonKey;
use crate::difit::editor::DifitEditor;
use crate::difit::imports::Snapshot;

use super::checkout::Checkout;
use super::client::GithubApi;
use super::connection::{RETRY_EVERY, is_network_error};
use super::graphql::Posted;
use super::plan::{Previous, SyncAction, plan};
use super::registry::{Removal, SharedRegistry, SyncStatus, SyncedComment};
use super::session::{PrState, PullRequest};

/// How often to pull from GitHub without being asked.
pub const PULL_EVERY: Duration = Duration::from_secs(60);

/// The outside world the sync pass talks to.
pub struct SyncPorts {
    pub api: Box<dyn GithubApi>,
    pub checkout: Box<dyn Checkout>,
    pub editor: Box<dyn DifitEditor>,
}

/// Keeps the PR, the checkout, and difit in step.
pub struct GithubSync {
    pub(super) registry: SharedRegistry,
    pub(super) ports: SyncPorts,
    pub(super) comparison: ComparisonKey,
    previous: Previous,
    pub(super) pull_every: Duration,
    pub(super) retry_every: Duration,
    looked_up_at: Option<Instant>,
}

impl GithubSync {
    /// A sync pass recording into `registry` for a review of `comparison`.
    #[must_use]
    pub fn new(registry: SharedRegistry, comparison: ComparisonKey, ports: SyncPorts) -> Self {
        Self {
            registry,
            ports,
            comparison,
            previous: Previous::default(),
            pull_every: PULL_EVERY,
            retry_every: RETRY_EVERY,
            looked_up_at: None,
        }
    }

    /// Run one pass against `snapshot`.
    pub fn tick(&mut self, snapshot: &Snapshot) {
        self.retry_connection_if_due();
        if self.may_call() && self.lookup_due() {
            self.look_up();
        }
        let pr = self.registry.read(|s| s.session.pr().cloned());
        self.push(snapshot, pr.as_ref());
        self.previous = Previous::from_snapshot(snapshot);
        let Some(pr) = pr else {
            self.refuse_submit_without_pr();
            return;
        };
        if self.may_call() {
            self.flush_viewed(&pr);
        }
        if self.may_call() {
            self.submit_if_requested(&pr);
        }
        if self.may_call() && self.pull_due() {
            self.pull(snapshot, &pr);
        }
    }

    fn lookup_due(&self) -> bool {
        let (unavailable, asked) = self.registry.read(|s| {
            (
                !matches!(s.session.pr, PrState::Available(_)),
                s.session.pull_requested,
            )
        });
        unavailable
            && (asked
                || self
                    .looked_up_at
                    .is_none_or(|at| at.elapsed() >= self.pull_every))
    }

    /// Look the PR up. When GitHub cannot be reached the PR stays unknown, so
    /// PR comments wait for it instead of failing as if there were no PR.
    fn look_up(&mut self) {
        self.looked_up_at = Some(Instant::now());
        let api = &self.ports.api;
        let state = match api.resolve_pr() {
            Ok(pr) => PrState::Available(pr),
            Err(e) if self.lost(&e) => return,
            Err(e) => PrState::Unavailable(e.to_string()),
        };
        let viewer = match api.viewer() {
            Err(e) if self.lost(&e) => return,
            viewer => viewer.ok(),
        };
        let review = match &state {
            PrState::Available(pr) => match api.pending_review(pr) {
                Err(e) if self.lost(&e) => return,
                review => review.ok().flatten(),
            },
            _ => None,
        };
        self.registry.session(|s| {
            s.pull_requested = matches!(state, PrState::Available(_));
            s.pr = state;
            s.viewer = viewer;
            s.review_id = review;
        });
    }

    fn push(&self, snapshot: &Snapshot, pr: Option<&PullRequest>) {
        let is_pr_known = self.registry.read(|s| s.session.pr != PrState::Unknown);
        for action in plan(snapshot, &self.previous, &self.registry.snapshot()) {
            if is_pr_known && self.may_call() {
                self.apply(pr, action);
            } else {
                self.defer(action);
            }
        }
    }

    pub(super) fn apply(&self, pr: Option<&PullRequest>, action: SyncAction) {
        match action {
            SyncAction::AddThread {
                message_id,
                comment,
            } => {
                let result = self.with_review(pr, |api, review| api.add_thread(review, &comment));
                self.record_post(&message_id, &comment.body, true, result);
            }
            SyncAction::AddReply {
                message_id,
                thread_id,
                body,
            } => {
                let result =
                    self.with_review(pr, |api, review| api.add_reply(review, &thread_id, &body));
                self.record_post(&message_id, &body, false, result);
            }
            SyncAction::Update {
                message_id,
                node_id,
                body,
            } => self.apply_update(&message_id, &node_id, body),
            SyncAction::Delete {
                message_id,
                node_id,
            } => match self.ports.api.delete(&node_id) {
                Ok(()) => self.forget(&message_id),
                Err(e) if self.lost(&e) => self.queue_removal(&message_id, Removal::Delete),
                Err(e) => self.edit(&message_id, |entry| {
                    entry.removal = None;
                    entry.error = Some(e.to_string());
                }),
            },
            SyncAction::Resolve {
                message_id,
                thread_id,
            } => self.apply_resolve(&message_id, &thread_id),
            SyncAction::Forget { message_id } => self.forget(&message_id),
            SyncAction::Reject {
                message_id,
                body,
                reason,
            } => self.record_post(&message_id, &body, false, Err(anyhow!(reason))),
        }
    }

    fn apply_update(&self, message_id: &str, node_id: &str, body: String) {
        // Unreachable: the body still differs from GitHub's, so the next pass
        // plans the update again.
        let error = match self.ports.api.update(node_id, &body) {
            Err(e) if self.lost(&e) => return,
            result => result.err(),
        };
        self.edit(message_id, |entry| {
            if error.is_none() {
                entry.body = Some(body);
            }
            entry.error = error.map(|e| e.to_string());
        });
    }

    fn apply_resolve(&self, message_id: &str, thread_id: &str) {
        // Forgotten unless GitHub was unreachable: if GitHub refused, it still
        // has the open conversation and the next pull brings it back.
        match self.ports.api.resolve(thread_id) {
            Err(e) if self.lost(&e) => return self.queue_removal(message_id, Removal::Resolve),
            Err(e) => {
                let notice = format!("Could not resolve a conversation on GitHub: {e}");
                self.registry.session(|s| s.notice = Some(notice));
            }
            Ok(()) => {}
        }
        self.forget(message_id);
    }

    /// Run `call` against the reviewer's pending review, starting one if none
    /// exists. A cached review that GitHub no longer knows (submitted or
    /// deleted on github.com) is dropped and the call retried once; a call that
    /// could not reach GitHub is not retried.
    fn with_review(
        &self,
        pr: Option<&PullRequest>,
        call: impl Fn(&dyn GithubApi, &str) -> Result<Posted>,
    ) -> Result<Posted> {
        let pr = pr.ok_or_else(|| self.no_pr_error())?;
        let cached = self.registry.read(|s| s.session.review_id.clone());
        let review = self.review(pr, cached.clone())?;
        match call(self.ports.api.as_ref(), &review) {
            Err(e) if cached.is_some() && !is_network_error(&e) => {
                let fresh = self.review(pr, None)?;
                call(self.ports.api.as_ref(), &fresh)
            }
            result => result,
        }
    }

    fn review(&self, pr: &PullRequest, cached: Option<String>) -> Result<String> {
        if let Some(id) = cached {
            return Ok(id);
        }
        let api = &self.ports.api;
        let id = match api.pending_review(pr)? {
            Some(id) => id,
            None => api.create_review(pr)?,
        };
        self.registry.session(|s| s.review_id = Some(id.clone()));
        Ok(id)
    }

    pub(super) fn no_pr_error(&self) -> anyhow::Error {
        let reason = self.registry.read(|s| match &s.session.pr {
            PrState::Unavailable(reason) => reason.clone(),
            _ => "This branch's PR has not been looked up yet.".to_owned(),
        });
        anyhow!("No linked PR: {reason}")
    }

    /// Record a post's outcome. A post that could not reach GitHub leaves the
    /// comment `pending`, to be posted once GitHub is reachable.
    fn record_post(&self, message_id: &str, body: &str, root: bool, result: Result<Posted>) {
        if let Err(e) = &result
            && self.lost(e)
        {
            return;
        }
        self.edit(message_id, |entry| {
            entry.body = Some(body.to_owned());
            match result {
                Ok(posted) => {
                    entry.status = SyncStatus::Draft;
                    entry.node_id = Some(posted.node_id);
                    entry.thread_id = Some(posted.thread_id);
                    entry.root = root;
                    entry.url = Some(posted.url);
                    entry.error = None;
                }
                Err(e) => {
                    entry.status = SyncStatus::Failed;
                    entry.error = Some(e.to_string());
                }
            }
        });
    }

    pub(super) fn edit(&self, message_id: &str, change: impl FnOnce(&mut SyncedComment)) {
        self.registry.update(|registry| {
            if let Some(entry) = registry.comments.get_mut(message_id) {
                change(entry);
            }
        });
    }

    pub(super) fn forget(&self, message_id: &str) {
        self.registry.update(|registry| {
            registry.comments.remove(message_id);
        });
    }

    fn pull_due(&self) -> bool {
        self.registry.read(|s| {
            s.session.pull_requested
                || s.session
                    .last_pull
                    .is_none_or(|at| at.elapsed() >= self.pull_every)
        })
    }
}

#[cfg(test)]
#[path = "sync_tests.rs"]
mod tests;
