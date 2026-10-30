//! The GitHub sync pass, run on the poller thread for every difit snapshot so
//! `gh` calls never block the TUI.
//!
//! Each tick it:
//!   1. looks the PR up (once, then again every pull interval while there is
//!      none, so a PR opened mid-session is found);
//!   2. pushes the reviewer's PR comment changes ([`plan`](super::plan)) into
//!      their pending review;
//!   3. sends viewed-file changes the browser queued;
//!   4. submits the pending review when the browser asks;
//!   5. pulls from GitHub every minute, or at once when asked
//!      ([`sync_pull`](super::sync_pull)).

use std::time::{Duration, Instant};

use anyhow::{Result, anyhow};

use crate::comparison::ComparisonKey;
use crate::difit::editor::DifitEditor;
use crate::difit::imports::Snapshot;

use super::checkout::Checkout;
use super::client::GithubApi;
use super::graphql::Posted;
use super::plan::{Previous, SyncAction, plan};
use super::registry::{Registry, SharedRegistry, SyncStatus, SyncedComment};
use super::session::{PrState, PullRequest, ReviewEvent, SubmitOutcome, ViewedState};

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
            looked_up_at: None,
        }
    }

    /// Run one pass against `snapshot`.
    pub fn tick(&mut self, snapshot: &Snapshot) {
        if self.lookup_due() {
            self.look_up();
        }
        let pr = self.registry.read(|s| s.session.pr().cloned());
        self.push(snapshot, pr.as_ref());
        self.previous = Previous::from_snapshot(snapshot);
        let Some(pr) = pr else {
            return;
        };
        self.flush_viewed(&pr);
        self.submit_if_requested(&pr);
        if self.pull_due() {
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

    fn look_up(&mut self) {
        self.looked_up_at = Some(Instant::now());
        let api = &self.ports.api;
        let state = match api.resolve_pr() {
            Ok(pr) => PrState::Available(pr),
            Err(e) => PrState::Unavailable(e.to_string()),
        };
        let viewer = api.viewer().ok();
        let review = match &state {
            PrState::Available(pr) => api.pending_review(pr).ok().flatten(),
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
        for action in plan(snapshot, &self.previous, &self.registry.snapshot()) {
            self.apply(pr, action);
        }
    }

    fn apply(&self, pr: Option<&PullRequest>, action: SyncAction) {
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
            } => {
                let error = self.ports.api.update(&node_id, &body).err();
                self.edit(&message_id, |entry| {
                    if error.is_none() {
                        entry.body = Some(body);
                    }
                    entry.error = error.map(|e| e.to_string());
                });
            }
            SyncAction::Delete {
                message_id,
                node_id,
            } => match self.ports.api.delete(&node_id) {
                Ok(()) => self.forget(&message_id),
                Err(e) => self.edit(&message_id, |entry| entry.error = Some(e.to_string())),
            },
            SyncAction::Resolve {
                message_id,
                thread_id,
            } => {
                // Forgotten either way: if resolving failed, GitHub still has
                // the open conversation and the next pull brings it back.
                if let Err(e) = self.ports.api.resolve(&thread_id) {
                    let notice = format!("Could not resolve a conversation on GitHub: {e}");
                    self.registry.session(|s| s.notice = Some(notice));
                }
                self.forget(&message_id);
            }
            SyncAction::Forget { message_id } => self.forget(&message_id),
            SyncAction::Reject {
                message_id,
                body,
                reason,
            } => self.record_post(&message_id, &body, false, Err(anyhow!(reason))),
        }
    }

    /// Run `call` against the reviewer's pending review, starting one if none
    /// exists. A cached review that GitHub no longer knows (submitted or
    /// deleted on github.com) is dropped and the call retried once.
    fn with_review(
        &self,
        pr: Option<&PullRequest>,
        call: impl Fn(&dyn GithubApi, &str) -> Result<Posted>,
    ) -> Result<Posted> {
        let pr = pr.ok_or_else(|| self.no_pr_error())?;
        let cached = self.registry.read(|s| s.session.review_id.clone());
        let review = self.review(pr, cached.clone())?;
        match call(self.ports.api.as_ref(), &review) {
            Err(_) if cached.is_some() => {
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

    fn no_pr_error(&self) -> anyhow::Error {
        let reason = self.registry.read(|s| match &s.session.pr {
            PrState::Unavailable(reason) => reason.clone(),
            _ => "This branch's PR has not been looked up yet.".to_owned(),
        });
        anyhow!("No linked PR: {reason}")
    }

    fn record_post(&self, message_id: &str, body: &str, root: bool, result: Result<Posted>) {
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

    fn edit(&self, message_id: &str, change: impl FnOnce(&mut SyncedComment)) {
        self.registry.update(|registry| {
            if let Some(entry) = registry.comments.get_mut(message_id) {
                change(entry);
            }
        });
    }

    fn forget(&self, message_id: &str) {
        self.registry.update(|registry| {
            registry.comments.remove(message_id);
        });
    }

    /// Send the viewed changes the browser queued. A change GitHub already
    /// matches is skipped. A directory marked in difit arrives as one change per
    /// file: GitHub only marks files one at a time.
    fn flush_viewed(&self, pr: &PullRequest) {
        let (active, queue) = self
            .registry
            .session(|s| (s.viewed.active, std::mem::take(&mut s.viewed.queue)));
        if !active {
            return;
        }
        for (path, viewed) in queue {
            let state = if viewed {
                ViewedState::Viewed
            } else {
                ViewedState::Unviewed
            };
            let already = self.registry.read(|s| {
                s.session
                    .viewed
                    .remote
                    .get(&path)
                    .is_some_and(|current| (*current == ViewedState::Viewed) == viewed)
            });
            if already {
                continue;
            }
            match self.ports.api.set_viewed(pr, &path, viewed) {
                Ok(()) => self.registry.session(|s| {
                    s.viewed.remote.insert(path, state);
                }),
                Err(e) => self.registry.session(|s| {
                    s.notice = Some(format!("Could not update viewed files on GitHub: {e}"));
                }),
            }
        }
    }

    fn submit_if_requested(&self, pr: &PullRequest) {
        let Some(request) = self.registry.read(|s| s.session.submit.clone()) else {
            return;
        };
        let registry = self.registry.snapshot();
        if registry
            .comments
            .values()
            .any(|c| c.status == SyncStatus::Pending)
        {
            return; // still posting drafts; submit once they are all in
        }
        let outcome = self.submit(pr, &request.body, request.event, &registry);
        let ok = outcome.is_ok();
        self.registry.update_state(|state| {
            if ok {
                for entry in state.registry.comments.values_mut() {
                    if entry.status == SyncStatus::Draft {
                        entry.status = SyncStatus::Published;
                    }
                }
                state.session.review_id = None;
                state.session.pull_requested = true;
            }
            state.session.submit = None;
            state.session.last_submit = Some(SubmitOutcome {
                ok,
                message: outcome.unwrap_or_else(|e| e.to_string()),
            });
        });
    }

    fn submit(
        &self,
        pr: &PullRequest,
        body: &str,
        event: ReviewEvent,
        registry: &Registry,
    ) -> Result<String> {
        let failed = registry.failed_count();
        if failed > 0 {
            return Err(anyhow!(
                "{failed} PR comment(s) failed to post. Fix or delete them, then submit again."
            ));
        }
        if event != ReviewEvent::Comment && self.registry.read(|s| s.session.is_own_pr()) {
            return Err(anyhow!("GitHub only lets you comment on your own PR."));
        }
        let cached = self.registry.read(|s| s.session.review_id.clone());
        let existing = match cached {
            Some(id) => Some(id),
            None => self.ports.api.pending_review(pr)?,
        };
        let review = match existing {
            Some(id) => id,
            None if event == ReviewEvent::Comment && body.trim().is_empty() => {
                return Err(anyhow!(
                    "Nothing to submit: add a PR comment or a summary first."
                ));
            }
            None => self.ports.api.create_review(pr)?,
        };
        self.ports.api.submit(pr, &review, event, body)?;
        Ok(match event {
            ReviewEvent::Comment => "Review submitted.",
            ReviewEvent::Approve => "Approved.",
            ReviewEvent::RequestChanges => "Changes requested.",
        }
        .to_owned())
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
