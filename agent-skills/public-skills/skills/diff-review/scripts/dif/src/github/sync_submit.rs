//! The review-submit half of the sync pass. The browser's request is queued in
//! the registry, so a review submitted while GitHub cannot be reached is sent
//! once it can, even after a relaunch.

use anyhow::{Result, anyhow};

use super::registry::{Registry, SyncStatus};
use super::session::{PrState, PullRequest, ReviewEvent, SubmitOutcome};
use super::sync::GithubSync;

impl GithubSync {
    /// Submit the queued review once every draft is in.
    pub(super) fn submit_if_requested(&self, pr: &PullRequest) {
        let registry = self.registry.snapshot();
        let Some(request) = registry.queued_submit.clone() else {
            return;
        };
        if registry
            .comments
            .values()
            .any(|c| c.status == SyncStatus::Pending || c.removal.is_some())
        {
            return; // still posting or removing drafts; submit once they are done
        }
        let outcome = self.submit(pr, &request.body, request.event, &registry);
        if let Err(e) = &outcome
            && self.lost(e)
        {
            return; // stays queued until GitHub is reachable
        }
        self.finish_submit(outcome);
    }

    /// Refuse a queued submit once the lookup found the branch has no open PR,
    /// so it does not wait forever.
    pub(super) fn refuse_submit_without_pr(&self) {
        let is_refused = self.registry.read(|s| {
            s.registry.queued_submit.is_some() && matches!(s.session.pr, PrState::Unavailable(_))
        });
        if is_refused {
            self.finish_submit(Err(self.no_pr_error()));
        }
    }

    /// Take the submit off the queue and record its outcome for the browser.
    fn finish_submit(&self, outcome: Result<String>) {
        let is_submitted = outcome.is_ok();
        self.registry.update_state(|state| {
            if is_submitted {
                for entry in state.registry.comments.values_mut() {
                    if entry.status == SyncStatus::Draft {
                        entry.status = SyncStatus::Published;
                    }
                }
                state.session.review_id = None;
                state.session.pull_requested = true;
            }
            state.registry.queued_submit = None;
            state.session.last_submit = Some(SubmitOutcome {
                ok: is_submitted,
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
        let num_failed = registry.failed_count();
        if num_failed > 0 {
            return Err(anyhow!(
                "{num_failed} PR comment(s) failed to post. Fix or delete them, then submit again."
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
}
