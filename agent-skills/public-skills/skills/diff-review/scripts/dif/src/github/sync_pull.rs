//! The pull half of the sync pass: bring the checkout, difit's comments, and
//! difit's viewed files in line with the PR.

use std::time::Instant;

use anyhow::Result;

use crate::comparison::ComparisonKey;
use crate::difit::editor::DifitEdit;
use crate::difit::imports::Snapshot;

use super::checkout::{Unstash, branch_step, fast_forward_keeping_changes};
use super::conflicts::conflicts_notice;
use super::graphql::RemoteState;
use super::plan::message_ids;
use super::pull::{reconcile, viewed_changes};
use super::session::PullRequest;
use super::sync::GithubSync;

impl GithubSync {
    /// Pull everything from GitHub, recording the outcome for the browser.
    ///
    /// The requests are taken up front, so a Sync clicked while this pull runs
    /// queues another pull instead of being cleared by this one. A pull that
    /// could not reach GitHub is asked for again, keeping a Sync's permission to
    /// stash, and is not reported as finished.
    pub(super) fn pull(&self, snapshot: &Snapshot, pr: &PullRequest) {
        let reviewer_asked = self.registry.session(|s| {
            s.pulling = true;
            s.pull_requested = false;
            std::mem::take(&mut s.reviewer_pull)
        });
        let result = self.pull_inner(snapshot, pr, reviewer_asked);
        let is_lost = result.as_ref().is_err_and(|e| self.lost(e));
        self.registry.session(|s| {
            s.pulling = false;
            if is_lost {
                s.pull_requested = true;
                s.reviewer_pull |= reviewer_asked;
                return;
            }
            s.last_pull = Some(Instant::now());
            s.pull_error = result.err().map(|e| e.to_string());
            if reviewer_asked {
                s.reviewer_pulls += 1;
            }
        });
    }

    fn pull_inner(&self, snapshot: &Snapshot, pr: &PullRequest, may_stash: bool) -> Result<()> {
        let remote = self.ports.api.fetch(pr)?;
        let review = if remote.has_pending_review {
            self.ports.api.pending_review(pr).ok().flatten()
        } else {
            None
        };
        let notice = self.step_branch(pr, &remote.head_sha, may_stash);
        let viewed_block = self.viewed_block(pr, &remote.head_sha);
        self.registry.session(|s| {
            s.review_id = review;
            s.notice = notice;
            if let super::session::PrState::Available(current) = &mut s.pr {
                current.head_sha.clone_from(&remote.head_sha);
            }
        });
        self.pull_comments(snapshot, &remote)?;
        self.pull_viewed(&remote, viewed_block);
        Ok(())
    }

    /// Fast-forward to the PR head when safe, stashing local changes around
    /// it when `may_stash`. Returns what the reviewer should know about the
    /// branch, if anything.
    fn step_branch(&self, pr: &PullRequest, head: &str, may_stash: bool) -> Option<String> {
        let checkout = self.ports.checkout.as_ref();
        if checkout.head().as_deref() == Some(head) {
            return None;
        }
        let step = checkout
            .fetch_pr(pr.number)
            .and_then(|()| checkout.relation(head))
            .map(|relation| branch_step(relation, checkout.is_clean(), may_stash));
        let step = match step {
            Err(e) => return Some(format!("Could not check the PR's new commits: {e}")),
            Ok(step) if !step.fast_forward => return step.notice,
            Ok(step) => step,
        };
        let outcome = fast_forward_keeping_changes(checkout, head, step.stash);
        let is_moved = checkout.head().as_deref() == Some(head);
        if is_moved {
            self.registry.session(|s| s.fast_forwards += 1);
        }
        match outcome {
            Ok(Unstash::Applied) => None,
            Ok(Unstash::Conflicts(files)) => {
                let notice = conflicts_notice(files.len());
                self.registry.session(|s| s.conflicts = Some(files));
                Some(notice)
            }
            Err(e) if is_moved => Some(format!(
                "Pulled the PR's new commits, but could not restore your local changes. They are still in `git stash list`: {e:#}"
            )),
            Err(e) => Some(format!("Could not pull the PR's new commits: {e:#}")),
        }
    }

    /// Why viewed files cannot sync right now, or `None` when they can: only
    /// when difit shows the PR's own diff do its paths and contents match.
    fn viewed_block(&self, pr: &PullRequest, head: &str) -> Option<String> {
        let compares_base = match &self.comparison {
            ComparisonKey::Branch(base) => {
                base == &pr.base_ref || base.strip_prefix("origin/") == Some(pr.base_ref.as_str())
            }
            _ => false,
        };
        if !compares_base {
            return Some(format!(
                "Viewed files sync only when dif compares against the PR's base ({}).",
                pr.base_ref
            ));
        }
        (self.ports.checkout.head().as_deref() != Some(head))
            .then(|| "Viewed files sync only when your checkout is at the PR head.".to_owned())
    }

    fn pull_comments(&self, snapshot: &Snapshot, remote: &RemoteState) -> Result<()> {
        let registry = self.registry.snapshot();
        let mut plan = reconcile(remote, &registry, snapshot);
        let live = message_ids(snapshot);
        let resurrected: Vec<String> = self.registry.read(|s| {
            s.session
                .tombstones
                .iter()
                .filter(|id| live.contains(*id))
                .cloned()
                .collect()
        });
        plan.edits.extend(
            resurrected
                .into_iter()
                .map(|message_id| DifitEdit::Remove { message_id }),
        );
        // Record first: once difit holds an added comment the LLM dispatcher may
        // see it, and it must already be known as a PR comment by then.
        self.registry.update_state(|state| {
            state.registry.comments.extend(plan.upserts);
            for id in &plan.forgets {
                state.registry.comments.remove(id);
            }
            state.session.tombstones.extend(plan.removed);
        });
        self.ports.editor.apply(&plan.edits)
    }

    /// Record GitHub's viewed state and the changes difit must apply. A path
    /// with a local change still queued keeps the local change: it reaches
    /// GitHub on the next pass. While sync is blocked the queue is dropped,
    /// since those changes can never line up with the PR's files.
    fn pull_viewed(&self, remote: &RemoteState, block: Option<String>) {
        self.registry.update_state(|state| {
            let queued = &mut state.registry.queued_viewed;
            let viewed = &mut state.session.viewed;
            viewed.active = block.is_none();
            viewed.reason = block;
            if viewed.active {
                let changes = viewed_changes(&remote.files, &viewed.remote, viewed.initialized);
                viewed.push_events(
                    changes
                        .into_iter()
                        .filter(|(path, _)| !queued.contains_key(path)),
                );
                viewed.initialized = true;
            } else {
                viewed.initialized = false;
                queued.clear();
            }
            viewed.remote = remote.files.iter().cloned().collect();
        });
    }
}
