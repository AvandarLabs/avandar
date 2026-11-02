//! The live GitHub state of one `dif` session: the PR, the reviewer's pending
//! review, requests queued by the browser, the last pull, and viewed-file sync.
//!
//! None of it is persisted. It is re-derived from GitHub on every launch, and
//! the browser reads it (with the registry's comments) as `/__wrap/github.json`.

use std::collections::{BTreeMap, HashSet};
use std::time::Instant;

use serde::Serialize;
use serde_json::{Value, json};

use super::conflicts::{ConflictResolution, llm_resolves_notice, reviewer_resolves_notice};
use super::registry::Registry;

/// The pull request PR comments go to.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PullRequest {
    pub number: u64,
    pub url: String,
    /// The PR's GraphQL node id.
    pub node_id: String,
    /// The PR head commit new review comments are anchored to.
    pub head_sha: String,
    /// The branch the PR merges into, e.g. `develop`.
    pub base_ref: String,
    /// The PR author's login.
    pub author: String,
}

/// Whether a PR is available to post to.
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub enum PrState {
    /// Not looked up yet.
    #[default]
    Unknown,
    /// The branch has an open PR.
    Available(PullRequest),
    /// No PR to post to, with the reason shown to the reviewer.
    Unavailable(String),
}

/// How the reviewer submits their pending review, as GitHub names it.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ReviewEvent {
    Comment,
    Approve,
    RequestChanges,
}

impl ReviewEvent {
    /// Parse the browser's / GitHub's spelling.
    #[must_use]
    pub fn parse(value: &str) -> Option<Self> {
        match value {
            "COMMENT" => Some(Self::Comment),
            "APPROVE" => Some(Self::Approve),
            "REQUEST_CHANGES" => Some(Self::RequestChanges),
            _ => None,
        }
    }

    /// GitHub's `PullRequestReviewEvent` spelling.
    #[must_use]
    pub const fn as_github(self) -> &'static str {
        match self {
            Self::Comment => "COMMENT",
            Self::Approve => "APPROVE",
            Self::RequestChanges => "REQUEST_CHANGES",
        }
    }
}

/// A review submit the browser asked for.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SubmitRequest {
    pub event: ReviewEvent,
    pub body: String,
}

/// GitHub's per-user viewed state for one PR file.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ViewedState {
    Viewed,
    Unviewed,
    /// Viewed once, but the file changed since.
    Dismissed,
}

impl ViewedState {
    /// Parse GitHub's `FileViewedState`.
    #[must_use]
    pub fn parse(value: &str) -> Option<Self> {
        match value {
            "VIEWED" => Some(Self::Viewed),
            "UNVIEWED" => Some(Self::Unviewed),
            "DISMISSED" => Some(Self::Dismissed),
            _ => None,
        }
    }
}

/// One GitHub-side viewed change the browser must apply to difit.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct ViewedEvent {
    pub seq: u64,
    pub path: String,
    pub viewed: bool,
}

/// The most viewed events kept for the browser to catch up on.
const MAX_VIEWED_EVENTS: usize = 2000;

/// Viewed-file sync between difit and GitHub.
#[derive(Debug, Default)]
pub struct ViewedSync {
    /// Whether difit is showing the PR's own diff, the only time paths and
    /// contents line up well enough to sync.
    pub active: bool,
    /// Why sync is paused, when it is.
    pub reason: Option<String>,
    /// GitHub's state per path as of the last pull or push.
    pub remote: BTreeMap<String, ViewedState>,
    /// Changes for the browser to apply to difit, oldest first.
    pub events: Vec<ViewedEvent>,
    pub seq: u64,
    /// Whether the first pull (where GitHub wins outright) has happened.
    pub initialized: bool,
    /// Local changes waiting to be sent to GitHub.
    pub queue: Vec<(String, bool)>,
}

impl ViewedSync {
    /// Record GitHub-side changes for the browser to apply.
    pub fn push_events(&mut self, changes: impl IntoIterator<Item = (String, bool)>) {
        for (path, viewed) in changes {
            self.seq += 1;
            self.events.push(ViewedEvent {
                seq: self.seq,
                path,
                viewed,
            });
        }
        let overflow = self.events.len().saturating_sub(MAX_VIEWED_EVENTS);
        self.events.drain(..overflow);
    }
}

/// The outcome of the last review submit.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct SubmitOutcome {
    pub ok: bool,
    pub message: String,
}

/// All live GitHub state for this session.
#[derive(Debug)]
pub struct Session {
    /// Identifies this launch, so the browser re-applies viewed events from the
    /// start after a relaunch rather than trusting a stale cursor.
    pub id: String,
    pub pr: PrState,
    /// The `gh` account's login.
    pub viewer: Option<String>,
    /// The reviewer's pending review on the PR, if one exists.
    pub review_id: Option<String>,
    pub pull_requested: bool,
    /// The reviewer clicked Sync: the next pull may stash local changes to
    /// bring in the PR's new commits. A background pull never touches them.
    pub reviewer_pull: bool,
    /// Finished pulls the reviewer asked for. The browser reloads each time this grows.
    pub reviewer_pulls: u64,
    pub pulling: bool,
    pub last_pull: Option<Instant>,
    pub pull_error: Option<String>,
    /// Something the reviewer should know about the branch vs the PR.
    pub notice: Option<String>,
    /// Bumped each time sync fast-forwards the branch, so the browser reloads
    /// the diff.
    pub fast_forwards: u64,
    /// Files a pull's stash restore left conflicted, until the reviewer says who resolves them.
    pub conflicts: Option<Vec<String>>,
    /// Conflicted files the reviewer asked the LLM to resolve. The TUI takes
    /// them and types the request into the LLM pane.
    pub conflicts_for_llm: Option<Vec<String>>,
    pub submit: Option<SubmitRequest>,
    pub last_submit: Option<SubmitOutcome>,
    pub viewed: ViewedSync,
    /// Message ids removed from difit because GitHub deleted or resolved them.
    /// A stale browser save can bring one back; it must never reach the LLM.
    pub tombstones: HashSet<String>,
}

impl Session {
    /// A fresh session with a new id.
    #[must_use]
    pub fn new() -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            pr: PrState::Unknown,
            viewer: None,
            review_id: None,
            pull_requested: false,
            reviewer_pull: false,
            reviewer_pulls: 0,
            pulling: false,
            last_pull: None,
            pull_error: None,
            notice: None,
            fast_forwards: 0,
            conflicts: None,
            conflicts_for_llm: None,
            submit: None,
            last_submit: None,
            viewed: ViewedSync::default(),
            tombstones: HashSet::new(),
        }
    }

    /// The PR, when one is available.
    #[must_use]
    pub const fn pr(&self) -> Option<&PullRequest> {
        match &self.pr {
            PrState::Available(pr) => Some(pr),
            _ => None,
        }
    }

    /// Whether the PR was opened by the `gh` account. GitHub only lets an author
    /// comment on their own PR, never approve it or request changes.
    #[must_use]
    pub fn is_own_pr(&self) -> bool {
        matches!((self.pr(), &self.viewer), (Some(pr), Some(viewer)) if &pr.author == viewer)
    }

    /// Record who resolves the open merge conflicts. A no-op when none are
    /// open, so a second browser tab answering late changes nothing.
    pub fn answer_conflicts(&mut self, resolution: ConflictResolution) {
        let Some(files) = self.conflicts.take() else {
            return;
        };
        match resolution {
            ConflictResolution::Llm => {
                self.notice = Some(llm_resolves_notice(files.len()));
                self.conflicts_for_llm = Some(files);
            }
            ConflictResolution::Reviewer => {
                self.notice = Some(reviewer_resolves_notice(files.len()));
            }
        }
    }

    /// The browser's view of the session plus the registry's comments.
    #[must_use]
    pub fn state_json(&self, registry: &Registry) -> Value {
        let (available, reason) = match &self.pr {
            PrState::Available(_) => (true, None),
            PrState::Unavailable(reason) => (false, Some(reason.clone())),
            PrState::Unknown => (false, None),
        };
        json!({
            "sessionId": self.id,
            "lookedUp": self.pr != PrState::Unknown,
            "available": available,
            "reason": reason,
            "pr": self.pr().map(|pr| json!({
                "number": pr.number,
                "url": pr.url,
                "author": pr.author,
                "isOwn": self.is_own_pr(),
            })),
            "drafts": registry.draft_count(),
            "failed": registry.failed_count(),
            "comments": registry.comments,
            "submitting": self.submit.is_some(),
            "lastSubmit": self.last_submit,
            "sync": {
                "pulling": self.pulling || self.pull_requested,
                "secondsSincePull": self.last_pull.map(|at| at.elapsed().as_secs()),
                "error": self.pull_error,
                "notice": self.notice,
                "reviewerPulls": self.reviewer_pulls,
            },
            "fastForwards": self.fast_forwards,
            "conflicts": self.conflicts,
            "viewed": {
                "active": self.viewed.active,
                "reason": self.viewed.reason,
                "events": self.viewed.events,
            },
        })
    }
}

impl Default for Session {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn pr(author: &str) -> PullRequest {
        PullRequest {
            number: 7,
            url: "https://github.com/o/r/pull/7".to_owned(),
            node_id: "PR_1".to_owned(),
            head_sha: "abc".to_owned(),
            base_ref: "develop".to_owned(),
            author: author.to_owned(),
        }
    }

    #[test]
    fn own_pr_needs_a_matching_viewer() {
        let mut session = Session::new();
        session.pr = PrState::Available(pr("jpsyx"));
        assert!(!session.is_own_pr(), "viewer unknown");
        session.viewer = Some("jpsyx".to_owned());
        assert!(session.is_own_pr());
        session.viewer = Some("someone".to_owned());
        assert!(!session.is_own_pr());
    }

    #[test]
    fn state_json_reports_availability_and_ownership() {
        let mut session = Session::new();
        let state = session.state_json(&Registry::default());
        assert_eq!(state["available"], false);
        assert_eq!(state["lookedUp"], false);

        session.pr = PrState::Available(pr("alice"));
        session.viewer = Some("jpsyx".to_owned());
        let state = session.state_json(&Registry::default());
        assert_eq!(state["available"], true);
        assert_eq!(state["pr"]["isOwn"], false);
        assert_eq!(state["pr"]["number"], 7);
    }

    #[test]
    fn answering_conflicts_hands_them_to_the_llm_or_leaves_them_to_the_reviewer() {
        let conflicted = || Some(vec!["a.rs".to_owned()]);
        let mut session = Session::new();
        session.conflicts = conflicted();
        session.answer_conflicts(ConflictResolution::Llm);
        assert_eq!(session.conflicts, None);
        assert_eq!(session.conflicts_for_llm, conflicted());
        assert!(session.notice.unwrap().contains("LLM"));

        let mut session = Session::new();
        session.conflicts = conflicted();
        session.answer_conflicts(ConflictResolution::Reviewer);
        assert_eq!(session.conflicts, None);
        assert_eq!(session.conflicts_for_llm, None);
        let notice = session.notice.unwrap();
        assert!(notice.contains("git stash drop"), "{notice}");
    }

    #[test]
    fn state_json_carries_open_conflicts_and_finished_reviewer_pulls() {
        let mut session = Session::new();
        let state = session.state_json(&Registry::default());
        assert!(state["conflicts"].is_null());
        assert_eq!(state["sync"]["reviewerPulls"], 0);

        session.conflicts = Some(vec!["a.rs".to_owned()]);
        session.reviewer_pulls = 2;
        let state = session.state_json(&Registry::default());
        assert_eq!(state["conflicts"], serde_json::json!(["a.rs"]));
        assert_eq!(state["sync"]["reviewerPulls"], 2);
    }

    #[test]
    fn viewed_events_are_numbered_and_capped() {
        let mut viewed = ViewedSync::default();
        viewed.push_events((0..MAX_VIEWED_EVENTS + 5).map(|i| (format!("f{i}"), true)));
        assert_eq!(viewed.events.len(), MAX_VIEWED_EVENTS);
        assert_eq!(
            viewed.events.last().unwrap().seq,
            (MAX_VIEWED_EVENTS + 5) as u64
        );
    }

    #[test]
    fn review_events_round_trip() {
        for event in [
            ReviewEvent::Comment,
            ReviewEvent::Approve,
            ReviewEvent::RequestChanges,
        ] {
            assert_eq!(ReviewEvent::parse(event.as_github()), Some(event));
        }
        assert_eq!(ReviewEvent::parse("MERGE"), None);
    }
}
