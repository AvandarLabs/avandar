//! Stateful injection driver: turns successive difit snapshots into the
//! prompts to type into the claude pane, exactly once per reviewer comment.
//!
//! Kept free of any PTY so the baseline-then-dispatch-once behavior is unit
//! testable. The first snapshot seeds a baseline of existing reviewer comment
//! ids (so only comments added *after* launch trigger work); every later
//! snapshot yields prompts for newly-open comments and marks them dispatched.

use std::collections::HashSet;

use crate::difit::imports::Snapshot;

use super::dispatch::{pending_dispatches, reviewer_message_ids};
use super::prompt::build_prompt;

/// Tracks which reviewer comments have already been handed to claude.
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

    /// Prompts to type for `snapshot`. The first call only establishes the
    /// baseline and returns nothing; later calls return one prompt per
    /// newly-open reviewer comment and mark each dispatched.
    pub fn next_prompts(&mut self, snapshot: &Snapshot) -> Vec<String> {
        if !self.baseline_seeded {
            self.dispatched = reviewer_message_ids(snapshot);
            self.baseline_seeded = true;
            return Vec::new();
        }
        pending_dispatches(snapshot, &self.dispatched)
            .into_iter()
            .map(|comment| {
                self.dispatched.insert(comment.message_id.clone());
                build_prompt(&comment)
            })
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn snap(json: &str) -> Snapshot {
        serde_json::from_str(json).expect("valid snapshot")
    }

    const ONE_OPEN: &str = r#"{"version":1,"threads":[{"id":"t1","filePath":"a.rs",
        "position":{"side":"new","line":1},
        "messages":[{"id":"m1","body":"fix","author":"reviewer"}]}]}"#;

    #[test]
    fn first_snapshot_seeds_baseline_and_dispatches_nothing() {
        let mut d = Dispatcher::new();
        assert!(d.next_prompts(&snap(ONE_OPEN)).is_empty());
    }

    #[test]
    fn comment_added_after_baseline_is_dispatched_once() {
        let mut d = Dispatcher::new();
        // Baseline: empty review.
        assert!(d.next_prompts(&snap(r#"{"version":0,"threads":[]}"#)).is_empty());
        // New comment appears.
        let first = d.next_prompts(&snap(ONE_OPEN));
        assert_eq!(first.len(), 1);
        assert!(first[0].contains("fix"));
        // Same snapshot again: already dispatched, nothing new.
        assert!(d.next_prompts(&snap(ONE_OPEN)).is_empty());
    }

    #[test]
    fn comments_present_at_launch_are_not_dispatched() {
        let mut d = Dispatcher::new();
        // Baseline already contains the open comment → never dispatched.
        assert!(d.next_prompts(&snap(ONE_OPEN)).is_empty());
        assert!(d.next_prompts(&snap(ONE_OPEN)).is_empty());
    }
}
