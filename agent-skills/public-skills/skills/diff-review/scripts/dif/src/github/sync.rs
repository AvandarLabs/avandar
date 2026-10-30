//! The sync pass: run each poller snapshot through [`plan`](super::plan) and
//! carry the actions out against GitHub, recording every outcome in the
//! registry.
//!
//! It runs on the poller thread, so `gh` calls never block the TUI. The PR is
//! resolved once, on the first pass, so the browser learns early whether the
//! GitHub toggle can be offered.

use std::collections::HashSet;

use crate::difit::imports::Snapshot;

use super::client::{GithubApi, Posted};
use super::plan::{SyncAction, message_ids, plan};
use super::registry::{PrState, PullRequest, Registry, SharedRegistry, SyncStatus, SyncedComment};

/// Keeps the PR in line with difit's PR-synced comments.
pub struct GithubSync {
    registry: SharedRegistry,
    api: Box<dyn GithubApi>,
    previous_ids: HashSet<String>,
}

impl GithubSync {
    /// A sync pass recording into `registry` and calling GitHub through `api`.
    #[must_use]
    pub fn new(registry: SharedRegistry, api: Box<dyn GithubApi>) -> Self {
        Self {
            registry,
            api,
            previous_ids: HashSet::new(),
        }
    }

    /// Bring the PR in line with `snapshot`.
    pub fn tick(&mut self, snapshot: &Snapshot) {
        self.ensure_pr();
        let registry = self.registry.snapshot();
        let actions = plan(snapshot, &self.previous_ids, &registry);
        self.previous_ids = message_ids(snapshot);
        for action in actions {
            self.apply(&registry.pr, action);
        }
    }

    fn ensure_pr(&self) {
        if self.registry.snapshot().pr != PrState::Unknown {
            return;
        }
        let state = match self.api.resolve_pr() {
            Ok(pr) => PrState::Available(pr),
            Err(e) => PrState::Unavailable(format!("No open PR to comment on: {e}")),
        };
        self.registry.update(|registry| registry.pr = state);
    }

    fn apply(&self, pr: &PrState, action: SyncAction) {
        match action {
            SyncAction::Create {
                message_id,
                comment,
            } => {
                let result = with_pr(pr, |pr| self.api.create(pr, &comment));
                self.record_post(&message_id, &comment.body, result);
            }
            SyncAction::Reply {
                message_id,
                in_reply_to,
                body,
            } => {
                let result = with_pr(pr, |pr| self.api.reply(pr, in_reply_to, &body));
                self.record_post(&message_id, &body, result);
            }
            SyncAction::Update {
                message_id,
                github_id,
                body,
            } => {
                let error = self
                    .api
                    .update(github_id, &body)
                    .err()
                    .map(|e| e.to_string());
                self.edit(&message_id, |entry| {
                    if error.is_none() {
                        entry.body = Some(body);
                    }
                    entry.error = error;
                });
            }
            SyncAction::Delete {
                message_id,
                github_id,
            } => match self.api.delete(github_id) {
                Ok(()) => self.forget(&message_id),
                Err(e) => self.edit(&message_id, |entry| entry.error = Some(e.to_string())),
            },
            SyncAction::Forget { message_id } => self.forget(&message_id),
            SyncAction::Reject {
                message_id,
                body,
                reason,
            } => self.record_post(&message_id, &body, Err(anyhow::anyhow!(reason))),
        }
    }

    fn record_post(&self, message_id: &str, body: &str, result: anyhow::Result<Posted>) {
        self.edit(message_id, |entry| {
            entry.body = Some(body.to_owned());
            match result {
                Ok(posted) => {
                    entry.status = SyncStatus::Synced;
                    entry.github_id = Some(posted.id);
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
        self.registry.update(|registry: &mut Registry| {
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
}

fn with_pr(
    pr: &PrState,
    call: impl FnOnce(&PullRequest) -> anyhow::Result<Posted>,
) -> anyhow::Result<Posted> {
    match pr {
        PrState::Available(pr) => call(pr),
        PrState::Unavailable(reason) => Err(anyhow::anyhow!(reason.clone())),
        PrState::Unknown => Err(anyhow::anyhow!(
            "This branch's PR has not been looked up yet."
        )),
    }
}

#[cfg(test)]
mod tests {
    use std::sync::{Arc, Mutex};

    use anyhow::{Result, bail};

    use super::*;
    use crate::github::anchor::NewComment;

    /// Records every call and answers with canned ids.
    #[derive(Clone, Default)]
    struct FakeGithub {
        calls: Arc<Mutex<Vec<String>>>,
        no_pr: bool,
        fail_create: bool,
    }

    impl FakeGithub {
        fn calls(&self) -> Vec<String> {
            self.calls.lock().unwrap().clone()
        }
        fn log(&self, call: String) {
            self.calls.lock().unwrap().push(call);
        }
    }

    impl GithubApi for FakeGithub {
        fn resolve_pr(&self) -> Result<PullRequest> {
            self.log("resolve".to_owned());
            if self.no_pr {
                bail!("no pull requests found");
            }
            Ok(PullRequest {
                number: 7,
                url: "https://github.com/o/r/pull/7".to_owned(),
                head_sha: "abc".to_owned(),
            })
        }
        fn create(&self, _pr: &PullRequest, comment: &NewComment) -> Result<Posted> {
            self.log(format!("create {}:{}", comment.path, comment.line));
            if self.fail_create {
                bail!("Validation Failed");
            }
            Ok(Posted {
                id: 100,
                url: "https://github.com/o/r/pull/7#discussion_r100".to_owned(),
            })
        }
        fn reply(&self, _pr: &PullRequest, in_reply_to: u64, _body: &str) -> Result<Posted> {
            self.log(format!("reply {in_reply_to}"));
            Ok(Posted {
                id: 101,
                url: "u101".to_owned(),
            })
        }
        fn update(&self, github_id: u64, body: &str) -> Result<()> {
            self.log(format!("update {github_id} {body}"));
            Ok(())
        }
        fn delete(&self, github_id: u64) -> Result<()> {
            self.log(format!("delete {github_id}"));
            Ok(())
        }
    }

    fn snap(json: &str) -> Snapshot {
        serde_json::from_str(json).expect("valid snapshot")
    }

    fn one(body: &str) -> Snapshot {
        snap(&format!(
            r#"{{"version":1,"threads":[{{"id":"t1","filePath":"a.rs",
                "position":{{"side":"new","line":5}},
                "messages":[{{"id":"m1","body":"{body}","author":"User"}}]}}]}}"#
        ))
    }

    fn setup(fake: &FakeGithub) -> (tempfile::TempDir, SharedRegistry, GithubSync) {
        let dir = tempfile::tempdir().unwrap();
        let registry = SharedRegistry::load(dir.path().join("r-github.json"));
        let sync = GithubSync::new(registry.clone(), Box::new(fake.clone()));
        (dir, registry, sync)
    }

    #[test]
    fn posts_edits_and_deletes_a_marked_comment() {
        let fake = FakeGithub::default();
        let (_dir, registry, mut sync) = setup(&fake);
        registry.mark_pending(&["m1".to_owned()]);

        sync.tick(&one("why?"));
        let entry = registry.snapshot().comments["m1"].clone();
        assert_eq!(entry.status, SyncStatus::Synced);
        assert_eq!(entry.github_id, Some(100));

        sync.tick(&one("why not?"));
        sync.tick(&snap(r#"{"version":3,"threads":[]}"#));

        assert_eq!(
            fake.calls(),
            vec![
                "resolve",
                "create a.rs:5",
                "update 100 why not?",
                "delete 100"
            ]
        );
        assert!(registry.snapshot().comments.is_empty());
    }

    #[test]
    fn resolves_the_pr_once() {
        let fake = FakeGithub::default();
        let (_dir, _registry, mut sync) = setup(&fake);
        sync.tick(&snap(r#"{"version":0,"threads":[]}"#));
        sync.tick(&snap(r#"{"version":0,"threads":[]}"#));
        assert_eq!(fake.calls(), vec!["resolve"]);
    }

    #[test]
    fn no_pr_fails_the_comment_without_calling_github() {
        let fake = FakeGithub {
            no_pr: true,
            ..FakeGithub::default()
        };
        let (_dir, registry, mut sync) = setup(&fake);
        registry.mark_pending(&["m1".to_owned()]);
        sync.tick(&one("why?"));

        let state = registry.snapshot();
        assert!(matches!(state.pr, PrState::Unavailable(_)));
        assert_eq!(state.comments["m1"].status, SyncStatus::Failed);
        assert_eq!(fake.calls(), vec!["resolve"]);
    }

    #[test]
    fn a_failed_post_is_recorded_and_not_retried_until_edited() {
        let fake = FakeGithub {
            fail_create: true,
            ..FakeGithub::default()
        };
        let (_dir, registry, mut sync) = setup(&fake);
        registry.mark_pending(&["m1".to_owned()]);
        sync.tick(&one("why?"));
        sync.tick(&one("why?"));

        let entry = registry.snapshot().comments["m1"].clone();
        assert_eq!(entry.status, SyncStatus::Failed);
        assert_eq!(entry.error.as_deref(), Some("Validation Failed"));
        assert_eq!(fake.calls(), vec!["resolve", "create a.rs:5"]);
    }
}
