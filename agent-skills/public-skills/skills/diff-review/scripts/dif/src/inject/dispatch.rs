//! Deciding which reviewer comments still need to be handed to claude.
//!
//! A *reviewer* message is any authored message that isn't claude's own
//! (`author != "claude"`): difit's browser stamps hand-typed comments as
//! `"User"`, the `diff-review` skill posts as `"reviewer"`, and we treat
//! every such non-claude author as a reviewer. A reviewer message is *open*
//! when no `claude` message follows it in the same thread (claude hasn't
//! answered it yet). We dispatch each open comment exactly once, tracked by
//! message id in a `dispatched` set the caller owns, so a comment is never
//! typed into the claude pane twice, even before claude's reply lands.

use std::collections::HashSet;
use std::hash::BuildHasher;

use serde_json::Value;

use crate::difit::imports::Snapshot;

/// The default reviewer author label. The *effective* reviewer handle is
/// resolved at runtime by [`crate::difit::imports::reviewer_name`] (from the
/// `DIFF_REVIEW_REVIEWER` env var, set by `run.sh` via
/// `scripts/get-reviewer-name.sh`), which relabels difit's `"User"` default to
/// the reviewer's real handle. Reviewer *matching* is independent of the label:
/// [`is_reviewer`] treats any non-[`AGENT`] author as a reviewer.
pub const REVIEWER: &str = "reviewer";
/// Our own authorship tag (claude's replies). The one author we never treat as
/// a reviewer comment to dispatch.
pub const AGENT: &str = "claude";

/// Whether `author` denotes a reviewer comment: any present author that isn't
/// [`AGENT`]. An absent author is not a reviewer comment (nothing to attribute).
#[must_use]
fn is_reviewer(author: Option<&str>) -> bool {
    matches!(author, Some(a) if a != AGENT)
}

/// A reviewer comment ready to be typed into the claude pane.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PendingComment {
    /// The thread message id (also the dedup key in the dispatched set).
    pub message_id: String,
    /// File the comment is attached to, if any.
    pub file_path: Option<String>,
    /// A human line label like `L42` or `L10-12` (empty when unknown).
    pub line_label: String,
    /// The reviewer's comment text.
    pub body: String,
}

/// Open reviewer comments not yet in `dispatched`, in thread/message order.
#[must_use]
pub fn pending_dispatches<S: BuildHasher>(
    snapshot: &Snapshot,
    dispatched: &HashSet<String, S>,
) -> Vec<PendingComment> {
    let mut pending = Vec::new();
    for thread in &snapshot.threads {
        for (index, message) in thread.messages.iter().enumerate() {
            if !is_reviewer(message.author.as_deref()) {
                continue;
            }
            let Some(id) = message.id.as_deref() else {
                continue;
            };
            if dispatched.contains(id) {
                continue;
            }
            if answered_after(&thread.messages, index) {
                continue;
            }
            pending.push(PendingComment {
                message_id: id.to_owned(),
                file_path: thread.file_path.clone(),
                line_label: line_label(thread.position.as_ref()),
                body: message.body.clone(),
            });
        }
    }
    pending
}

/// Every reviewer message id present in a snapshot — used to seed the
/// dispatched set at startup so only comments added *after* launch trigger.
#[must_use]
pub fn reviewer_message_ids(snapshot: &Snapshot) -> HashSet<String> {
    message_ids(snapshot, is_reviewer)
}

/// Every `claude`-authored message id in a snapshot — used to seed the
/// reply-log baseline so only replies posted *after* launch are logged.
#[must_use]
pub fn claude_message_ids(snapshot: &Snapshot) -> HashSet<String> {
    message_ids(snapshot, |a| a == Some(AGENT))
}

/// Collect the ids of every message whose author satisfies `pred`.
fn message_ids(snapshot: &Snapshot, pred: impl Fn(Option<&str>) -> bool) -> HashSet<String> {
    let mut ids = HashSet::new();
    for thread in &snapshot.threads {
        for message in &thread.messages {
            if pred(message.author.as_deref()) {
                if let Some(id) = &message.id {
                    ids.insert(id.clone());
                }
            }
        }
    }
    ids
}

/// Format a comment location like `file:Lx`, `file`, `Lx`, or `the diff`.
#[must_use]
pub fn location_label(file_path: Option<&str>, line_label: &str) -> String {
    match (file_path, line_label) {
        (Some(path), "") => path.to_owned(),
        (Some(path), label) => format!("{path}:{label}"),
        (None, "") => "the diff".to_owned(),
        (None, label) => label.to_owned(),
    }
}

/// Whether any `claude` message follows index `from` in `messages`.
fn answered_after(messages: &[crate::difit::imports::ServerMessage], from: usize) -> bool {
    messages
        .iter()
        .skip(from + 1)
        .any(|m| m.author.as_deref() == Some(AGENT))
}

/// Render a difit `position` into a line label: `L42` for a single line,
/// `L10-12` for a range, empty when the shape is unknown.
pub(crate) fn line_label(position: Option<&Value>) -> String {
    let Some(line) = position.and_then(|p| p.get("line")) else {
        return String::new();
    };
    if let Some(n) = line.as_i64() {
        return format!("L{n}");
    }
    if let (Some(start), Some(end)) = (
        line.get("start").and_then(Value::as_i64),
        line.get("end").and_then(Value::as_i64),
    ) {
        return format!("L{start}-{end}");
    }
    String::new()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn snap(json: &str) -> Snapshot {
        serde_json::from_str(json).expect("valid snapshot")
    }

    #[test]
    fn unanswered_reviewer_comment_is_pending() {
        let s = snap(
            r#"{"version":1,"threads":[{"id":"t1","filePath":"a.rs",
                "position":{"side":"new","line":42},
                "messages":[{"id":"m1","body":"fix this","author":"reviewer"}]}]}"#,
        );
        let pending = pending_dispatches(&s, &HashSet::new());
        assert_eq!(pending.len(), 1);
        assert_eq!(pending[0].message_id, "m1");
        assert_eq!(pending[0].file_path.as_deref(), Some("a.rs"));
        assert_eq!(pending[0].line_label, "L42");
        assert_eq!(pending[0].body, "fix this");
    }

    #[test]
    fn browser_user_authored_comment_is_pending() {
        // difit's browser stamps hand-typed comments as author "User"; those
        // must dispatch just like skill-posted "reviewer" comments.
        let s = snap(
            r#"{"version":1,"threads":[{"id":"t1","filePath":"a.rs",
                "position":{"side":"new","line":7},
                "messages":[{"id":"m1","body":"rename this","author":"User"}]}]}"#,
        );
        let pending = pending_dispatches(&s, &HashSet::new());
        assert_eq!(pending.len(), 1);
        assert_eq!(pending[0].message_id, "m1");
        assert_eq!(pending[0].body, "rename this");
    }

    #[test]
    fn claude_only_message_is_not_a_reviewer_comment() {
        let s = snap(
            r#"{"version":1,"threads":[{"id":"t1","filePath":"a.rs","position":null,
                "messages":[{"id":"m1","body":"done","author":"claude"}]}]}"#,
        );
        assert!(pending_dispatches(&s, &HashSet::new()).is_empty());
    }

    #[test]
    fn authorless_message_is_not_dispatched() {
        let s = snap(
            r#"{"version":1,"threads":[{"id":"t1","filePath":"a.rs","position":null,
                "messages":[{"id":"m1","body":"mystery"}]}]}"#,
        );
        assert!(pending_dispatches(&s, &HashSet::new()).is_empty());
    }

    #[test]
    fn user_authored_comment_seeds_baseline() {
        let s = snap(
            r#"{"version":1,"threads":[{"id":"t1","filePath":"a.rs","position":null,
                "messages":[
                  {"id":"m1","body":"q","author":"User"},
                  {"id":"m2","body":"r","author":"claude"}]}]}"#,
        );
        let ids = reviewer_message_ids(&s);
        assert!(ids.contains("m1"));
        assert!(!ids.contains("m2"));
    }

    #[test]
    fn comment_answered_by_claude_is_not_pending() {
        let s = snap(
            r#"{"version":1,"threads":[{"id":"t1","filePath":"a.rs",
                "position":{"side":"new","line":1},
                "messages":[
                  {"id":"m1","body":"q","author":"reviewer"},
                  {"id":"m2","body":"done","author":"claude"}]}]}"#,
        );
        assert!(pending_dispatches(&s, &HashSet::new()).is_empty());
    }

    #[test]
    fn already_dispatched_comment_is_skipped() {
        let s = snap(
            r#"{"version":1,"threads":[{"id":"t1","filePath":"a.rs",
                "position":{"side":"new","line":1},
                "messages":[{"id":"m1","body":"q","author":"reviewer"}]}]}"#,
        );
        let dispatched = HashSet::from(["m1".to_owned()]);
        assert!(pending_dispatches(&s, &dispatched).is_empty());
    }

    #[test]
    fn reviewer_reply_after_claude_is_pending_again() {
        let s = snap(
            r#"{"version":1,"threads":[{"id":"t1","filePath":"a.rs",
                "position":{"side":"new","line":1},
                "messages":[
                  {"id":"m1","body":"q","author":"reviewer"},
                  {"id":"m2","body":"done","author":"claude"},
                  {"id":"m3","body":"not quite","author":"reviewer"}]}]}"#,
        );
        let dispatched = HashSet::from(["m1".to_owned()]);
        let pending = pending_dispatches(&s, &dispatched);
        assert_eq!(pending.len(), 1);
        assert_eq!(pending[0].message_id, "m3");
    }

    #[test]
    fn line_range_is_labelled() {
        let s = snap(
            r#"{"version":1,"threads":[{"id":"t1","filePath":"a.rs",
                "position":{"side":"new","line":{"start":10,"end":12}},
                "messages":[{"id":"m1","body":"x","author":"reviewer"}]}]}"#,
        );
        assert_eq!(pending_dispatches(&s, &HashSet::new())[0].line_label, "L10-12");
    }

    #[test]
    fn reviewer_ids_seed_baseline() {
        let s = snap(
            r#"{"version":1,"threads":[{"id":"t1","filePath":"a.rs","position":null,
                "messages":[
                  {"id":"m1","body":"q","author":"reviewer"},
                  {"id":"m2","body":"r","author":"claude"}]}]}"#,
        );
        let ids = reviewer_message_ids(&s);
        assert!(ids.contains("m1"));
        assert!(!ids.contains("m2"));
    }
}
