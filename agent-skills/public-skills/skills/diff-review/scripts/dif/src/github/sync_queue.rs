//! The queueing half of the sync pass: what happens to the reviewer's
//! interactions while GitHub cannot be reached, and sending the viewed-file
//! queue.
//!
//! Nothing is dropped. A PR comment stays `pending` and an edit keeps a body
//! that differs from GitHub's, so the planner plans both again on every pass. A
//! removal is recorded on the comment ([`Removal`]), viewed changes stay in
//! the registry's `queuedViewed`, and a submit stays requested. The registry
//! is saved to disk, so all of it but the submit survives a relaunch.

use super::connection::is_network_error;
use super::plan::SyncAction;
use super::registry::Removal;
use super::session::{PullRequest, ViewedState};
use super::sync::GithubSync;

impl GithubSync {
    /// Whether this pass may call GitHub.
    pub(super) fn may_call(&self) -> bool {
        self.registry.read(|s| s.session.connection.is_online())
    }

    /// Whether `error` means GitHub could not be reached. If so the connection
    /// is marked lost, so this pass makes no more calls.
    pub(super) fn lost(&self, error: &anyhow::Error) -> bool {
        let is_lost = is_network_error(error);
        if is_lost {
            self.registry.session(|s| s.connection.lose(error));
        }
        is_lost
    }

    /// Try GitHub again once a lost connection is due a retry, pulling so the
    /// pass is sure to make a call that tells whether it is back.
    pub(super) fn retry_connection_if_due(&self) {
        self.registry.session(|s| {
            if s.connection.retry_if_due(self.retry_every) {
                s.pull_requested = true;
            }
        });
    }

    /// Keep `action` for a pass that can reach GitHub. Only bookkeeping that
    /// needs no call happens now.
    pub(super) fn defer(&self, action: SyncAction) {
        match action {
            SyncAction::Delete { message_id, .. } => {
                self.queue_removal(&message_id, Removal::Delete);
            }
            SyncAction::Resolve { message_id, .. } => {
                self.queue_removal(&message_id, Removal::Resolve);
            }
            SyncAction::Forget { .. } | SyncAction::Reject { .. } => self.apply(None, action),
            // Still `pending`, or still a body that differs from GitHub's: the
            // planner plans it again.
            SyncAction::AddThread { .. }
            | SyncAction::AddReply { .. }
            | SyncAction::Update { .. } => {}
        }
    }

    pub(super) fn queue_removal(&self, message_id: &str, removal: Removal) {
        self.edit(message_id, |entry| entry.removal = Some(removal));
    }

    /// Send the queued viewed changes. A change GitHub already matches is
    /// skipped. A directory marked in difit arrives as one change per file:
    /// GitHub only marks files one at a time. A change leaves the queue once
    /// GitHub has it or refused it, unless the reviewer changed it again in the
    /// meantime.
    pub(super) fn flush_viewed(&self, pr: &PullRequest) {
        let (active, queue) = self
            .registry
            .read(|s| (s.session.viewed.active, s.registry.queued_viewed.clone()));
        if !active {
            return;
        }
        for (path, viewed) in queue {
            let state = if viewed {
                ViewedState::Viewed
            } else {
                ViewedState::Unviewed
            };
            let is_already_synced = self.registry.read(|s| {
                s.session
                    .viewed
                    .remote
                    .get(&path)
                    .is_some_and(|current| (*current == ViewedState::Viewed) == viewed)
            });
            let result = if is_already_synced {
                Ok(())
            } else {
                self.ports.api.set_viewed(pr, &path, viewed)
            };
            if let Err(e) = &result
                && self.lost(e)
            {
                return;
            }
            self.registry.update_state(|s| {
                match result {
                    Ok(()) => {
                        s.session.viewed.remote.insert(path.clone(), state);
                    }
                    Err(e) => {
                        s.session.notice =
                            Some(format!("Could not update viewed files on GitHub: {e}"));
                    }
                }
                if s.registry.queued_viewed.get(&path) == Some(&viewed) {
                    s.registry.queued_viewed.remove(&path);
                }
            });
        }
    }
}
