//! Detecting newly-posted `claude` replies so `dif` can log them in the difit
//! pane.
//!
//! The poller mirrors difit's comments; when claude POSTs a reply it shows up as
//! a new `claude`-authored message in the next snapshot. This watcher seeds a
//! baseline of existing `claude` message ids on the first snapshot (so replies
//! already present at launch are not re-logged), then reports each new reply's
//! location (`file:Lx`) exactly once. Parallel to the [`Dispatcher`] but for the
//! opposite direction: claude → difit, rather than reviewer → claude.
//!
//! [`Dispatcher`]: super::dispatcher::Dispatcher

use std::collections::HashSet;

use crate::difit::imports::Snapshot;

use super::dispatch::{AGENT, claude_message_ids, line_label, location_label};

/// Tracks which `claude` replies have already been logged to the difit pane.
#[derive(Default)]
pub struct ReplyWatcher {
    logged: HashSet<String>,
    baseline_seeded: bool,
}

impl ReplyWatcher {
    /// A fresh watcher with an empty baseline.
    #[must_use]
    pub fn new() -> Self {
        Self::default()
    }

    /// Locations (`file:Lx`) of `claude` replies new since the last call. The
    /// first call only establishes the baseline and returns nothing; later calls
    /// return one entry per newly-seen reply, each reported exactly once.
    pub fn new_reply_locations(&mut self, snapshot: &Snapshot) -> Vec<String> {
        if !self.baseline_seeded {
            self.logged = claude_message_ids(snapshot);
            self.baseline_seeded = true;
            return Vec::new();
        }
        let mut out = Vec::new();
        for thread in &snapshot.threads {
            for message in &thread.messages {
                if message.author.as_deref() != Some(AGENT) {
                    continue;
                }
                let Some(id) = message.id.as_deref() else {
                    continue;
                };
                // insert() is false when the id was already logged (or in the
                // baseline), so each reply is reported once.
                if self.logged.insert(id.to_owned()) {
                    out.push(location_label(
                        thread.file_path.as_deref(),
                        &line_label(thread.position.as_ref()),
                    ));
                }
            }
        }
        out
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn snap(json: &str) -> Snapshot {
        serde_json::from_str(json).expect("valid snapshot")
    }

    const QA: &str = r#"{"version":2,"threads":[{"id":"t1","filePath":"a.rs",
        "position":{"side":"new","line":42},
        "messages":[
          {"id":"m1","body":"why?","author":"reviewer"},
          {"id":"m2","body":"because","author":"claude"}]}]}"#;

    #[test]
    fn first_snapshot_seeds_baseline_and_logs_nothing() {
        let mut w = ReplyWatcher::new();
        assert!(w.new_reply_locations(&snap(QA)).is_empty());
    }

    #[test]
    fn reply_added_after_baseline_is_logged_once_with_location() {
        let mut w = ReplyWatcher::new();
        // Baseline: just the reviewer comment, no claude reply yet.
        let baseline = r#"{"version":1,"threads":[{"id":"t1","filePath":"a.rs",
            "position":{"side":"new","line":42},
            "messages":[{"id":"m1","body":"why?","author":"reviewer"}]}]}"#;
        assert!(w.new_reply_locations(&snap(baseline)).is_empty());

        // Claude posts a reply.
        let logged = w.new_reply_locations(&snap(QA));
        assert_eq!(logged, vec!["a.rs:L42".to_owned()]);

        // Same snapshot again: already logged, nothing new.
        assert!(w.new_reply_locations(&snap(QA)).is_empty());
    }

    #[test]
    fn reviewer_comments_are_never_logged_as_replies() {
        let mut w = ReplyWatcher::new();
        assert!(w.new_reply_locations(&snap(r#"{"version":0,"threads":[]}"#)).is_empty());
        let only_reviewer = r#"{"version":1,"threads":[{"id":"t1","filePath":"a.rs",
            "position":{"side":"new","line":1},
            "messages":[{"id":"m1","body":"q","author":"reviewer"}]}]}"#;
        assert!(w.new_reply_locations(&snap(only_reviewer)).is_empty());
    }

    #[test]
    fn replies_present_at_launch_are_not_logged() {
        let mut w = ReplyWatcher::new();
        // Baseline already contains the claude reply → never logged.
        assert!(w.new_reply_locations(&snap(QA)).is_empty());
        assert!(w.new_reply_locations(&snap(QA)).is_empty());
    }
}
