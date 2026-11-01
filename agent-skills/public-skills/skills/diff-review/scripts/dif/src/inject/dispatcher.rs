//! Stateful injection driver: turns successive difit snapshots into the
//! prompts to type into the LLM pane, exactly once per reviewer comment.
//!
//! Kept free of any PTY so the baseline-then-dispatch-once behavior is unit
//! testable. The first snapshot seeds a baseline of existing reviewer comment
//! ids (so only comments added *after* launch trigger work); every later
//! snapshot yields prompts for newly-open comments and marks them dispatched.
//!
//! Delivery is either eager (one prompt per comment, as soon as it appears) or
//! held for a bulk "Send all", which flushes every held comment as one prompt.
//! A held comment is simply not marked dispatched, so an edit made while it
//! waits is sent in its final form and a deleted one is never sent at all.
//! Comments bound for the GitHub PR are excluded entirely: they never reach
//! the LLM.

use std::collections::HashSet;
use std::hash::BuildHasher;

use crate::difit::imports::Snapshot;

use super::dispatch::{PendingComment, pending_dispatches, reviewer_message_ids};
use super::prompt::{build_batch_prompt, build_prompt};

/// What to do with open comments on this tick.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Delivery {
    /// Send each open comment as its own prompt now.
    Eager,
    /// Hold open comments and only report how many are waiting.
    Hold,
    /// Send every open comment now, batched into one prompt.
    SendAll,
}

/// The outcome of one dispatch tick.
#[derive(Debug, Default, PartialEq, Eq)]
pub struct DispatchOutcome {
    /// Prompts to type into the LLM pane, in order.
    pub prompts: Vec<String>,
    /// Open comments still held for a later "Send all".
    pub queued: usize,
}

/// Tracks which reviewer comments have already been handed to the LLM.
#[derive(Default)]
pub struct Dispatcher {
    dispatched: HashSet<String>,
    baseline_seeded: bool,
}

impl Dispatcher {
    /// A fresh dispatcher with an empty baseline.
    #[must_use]
    pub fn new() -> Self {
        Self::default()
    }

    /// Dispatch `snapshot`'s open reviewer comments per `delivery`, skipping
    /// every message id in `excluded` (comments bound for the GitHub PR).
    ///
    /// The first call only establishes the baseline and returns nothing.
    pub fn next_dispatch<S: BuildHasher>(
        &mut self,
        snapshot: &Snapshot,
        excluded: &HashSet<String, S>,
        delivery: Delivery,
    ) -> DispatchOutcome {
        if !self.baseline_seeded {
            self.dispatched = reviewer_message_ids(snapshot);
            self.baseline_seeded = true;
            return DispatchOutcome::default();
        }
        let open: Vec<PendingComment> = pending_dispatches(snapshot, &self.dispatched)
            .into_iter()
            .filter(|comment| !excluded.contains(&comment.message_id))
            .collect();
        if delivery == Delivery::Hold {
            return DispatchOutcome {
                prompts: Vec::new(),
                queued: open.len(),
            };
        }
        self.dispatched
            .extend(open.iter().map(|comment| comment.message_id.clone()));
        let prompts = match delivery {
            Delivery::SendAll if !open.is_empty() => vec![build_batch_prompt(&open)],
            _ => open.iter().map(build_prompt).collect(),
        };
        DispatchOutcome { prompts, queued: 0 }
    }
}

#[cfg(test)]
mod tests {
    use std::collections::HashSet;

    use super::*;

    fn snap(json: &str) -> Snapshot {
        serde_json::from_str(json).expect("valid snapshot")
    }

    fn eager(d: &mut Dispatcher, json: &str) -> Vec<String> {
        d.next_dispatch(&snap(json), &HashSet::new(), Delivery::Eager)
            .prompts
    }

    const ONE_OPEN: &str = r#"{"version":1,"threads":[{"id":"t1","filePath":"a.rs",
        "position":{"side":"new","line":1},
        "messages":[{"id":"m1","body":"fix","author":"reviewer"}]}]}"#;

    #[test]
    fn first_snapshot_seeds_baseline_and_dispatches_nothing() {
        let mut d = Dispatcher::new();
        assert!(eager(&mut d, ONE_OPEN).is_empty());
    }

    #[test]
    fn comment_added_after_baseline_is_dispatched_once() {
        let mut d = Dispatcher::new();
        // Baseline: empty review.
        assert!(eager(&mut d, EMPTY).is_empty());
        // New comment appears.
        let first = eager(&mut d, ONE_OPEN);
        assert_eq!(first.len(), 1);
        assert!(first[0].contains("fix"));
        // Same snapshot again: already dispatched, nothing new.
        assert!(eager(&mut d, ONE_OPEN).is_empty());
    }

    const TWO_OPEN: &str = r#"{"version":2,"threads":[
        {"id":"t1","filePath":"a.rs","position":{"side":"new","line":1},
         "messages":[{"id":"m1","body":"fix","author":"User"}]},
        {"id":"t2","filePath":"b.rs","position":{"side":"new","line":9},
         "messages":[{"id":"m2","body":"rename","author":"User"}]}]}"#;

    const EMPTY: &str = r#"{"version":0,"threads":[]}"#;

    fn seeded() -> Dispatcher {
        let mut d = Dispatcher::new();
        d.next_dispatch(&snap(EMPTY), &HashSet::new(), Delivery::Eager);
        d
    }

    #[test]
    fn bulk_holds_comments_and_reports_the_queue() {
        let mut d = seeded();
        let out = d.next_dispatch(&snap(TWO_OPEN), &HashSet::new(), Delivery::Hold);
        assert!(out.prompts.is_empty());
        assert_eq!(out.queued, 2);
        // Still held on the next tick: nothing was marked dispatched.
        let again = d.next_dispatch(&snap(TWO_OPEN), &HashSet::new(), Delivery::Hold);
        assert_eq!(again.queued, 2);
    }

    #[test]
    fn send_all_flushes_held_comments_as_one_prompt() {
        let mut d = seeded();
        d.next_dispatch(&snap(TWO_OPEN), &HashSet::new(), Delivery::Hold);
        let out = d.next_dispatch(&snap(TWO_OPEN), &HashSet::new(), Delivery::SendAll);
        assert_eq!(
            out.prompts.len(),
            1,
            "one batched prompt: {:?}",
            out.prompts
        );
        assert!(out.prompts[0].contains("fix") && out.prompts[0].contains("rename"));
        assert_eq!(out.queued, 0);
        let after = d.next_dispatch(&snap(TWO_OPEN), &HashSet::new(), Delivery::Hold);
        assert!(after.prompts.is_empty());
        assert_eq!(after.queued, 0, "flushed comments are never re-queued");
    }

    #[test]
    fn eager_sends_one_prompt_per_comment() {
        let mut d = seeded();
        let out = d.next_dispatch(&snap(TWO_OPEN), &HashSet::new(), Delivery::Eager);
        assert_eq!(out.prompts.len(), 2);
        assert_eq!(out.queued, 0);
    }

    #[test]
    fn github_comments_are_never_queued_or_sent() {
        let mut d = seeded();
        let github = HashSet::from(["m2".to_owned()]);
        let held = d.next_dispatch(&snap(TWO_OPEN), &github, Delivery::Hold);
        assert_eq!(held.queued, 1);
        let out = d.next_dispatch(&snap(TWO_OPEN), &github, Delivery::SendAll);
        assert_eq!(out.prompts.len(), 1);
        assert!(!out.prompts[0].contains("rename"), "{}", out.prompts[0]);
    }

    #[test]
    fn comments_present_at_launch_are_not_dispatched() {
        let mut d = Dispatcher::new();
        // Baseline already contains the open comment → never dispatched.
        assert!(eager(&mut d, ONE_OPEN).is_empty());
        assert!(eager(&mut d, ONE_OPEN).is_empty());
    }
}
