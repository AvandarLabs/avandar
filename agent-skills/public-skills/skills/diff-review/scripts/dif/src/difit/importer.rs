//! Reconciling an externally-written transcript back into the live difit server.
//!
//! The transcript is normally a *mirror*: the poller rewrites it from difit's
//! own state. But the `diff-review` skill also **writes** it — that is how a
//! review round's `claude` threads are authored — and since `dif` now starts
//! difit immediately (before any review exists), those writes land while difit
//! is already running. A mirror-only poller would overwrite them on its next
//! tick and the reviewer would never see them.
//!
//! So the poller treats a transcript it did not write as an *inbound* change:
//! entries difit has never held are POSTed to `/api/comment-imports`, exactly as
//! `claude` posts a reply. difit pushes them to the browser over SSE and the
//! next poll mirrors them back to disk. difit stays the single source of truth;
//! the file is how the skill talks to it.

use std::collections::HashSet;
use std::hash::BuildHasher;
use std::time::Duration;

use super::imports::{ImportEntry, Snapshot};

/// Parse transcript bytes into import entries. A malformed or half-written file
/// yields `None` so the caller can simply retry on the next tick.
#[must_use]
pub fn parse(text: &str) -> Option<Vec<ImportEntry>> {
    serde_json::from_str(text).ok()
}

/// Every message id in a snapshot. difit may omit a message id on a
/// single-message thread, in which case the thread's own id identifies it.
#[must_use]
pub fn snapshot_ids(snapshot: &Snapshot) -> HashSet<String> {
    snapshot
        .threads
        .iter()
        .flat_map(|thread| {
            thread.messages.iter().filter_map(|message| {
                message
                    .id
                    .as_deref()
                    .or(thread.id.as_deref())
                    .filter(|id| !id.is_empty())
                    .map(ToOwned::to_owned)
            })
        })
        .collect()
}

/// The entries an out-of-band transcript write adds to the conversation, in file
/// order so a reply never precedes the thread it belongs to.
///
/// - `last_written` is the exact text the poller last mirrored. When the file
///   still matches it, nothing came from outside and there is nothing to import.
/// - `seen` is every id difit has *ever* held this session, plus everything
///   already imported. It keeps a comment the reviewer just deleted from being
///   resurrected by a stale file, and keeps one id from being POSTed twice.
///
/// Entries without an id or a file path are skipped: difit cannot place them,
/// and one unplaceable entry must not fail the whole import batch.
#[must_use]
pub fn inbound_entries<S: BuildHasher>(
    file_text: &str,
    last_written: Option<&str>,
    seen: &HashSet<String, S>,
) -> Vec<ImportEntry> {
    if last_written == Some(file_text) {
        return Vec::new();
    }
    let Some(entries) = parse(file_text) else {
        return Vec::new();
    };
    entries
        .into_iter()
        .filter(|entry| !entry.id.is_empty() && entry.file_path.is_some())
        .filter(|entry| !seen.contains(&entry.id))
        .collect()
}

/// POST `entries` to difit's import endpoint. Returns whether difit accepted
/// them; a failure is non-fatal, the next tick retries.
#[must_use]
pub fn post(port: u16, entries: &[ImportEntry]) -> bool {
    if entries.is_empty() {
        return true;
    }
    ureq::post(&format!("http://localhost:{port}/api/comment-imports"))
        .timeout(Duration::from_secs(5))
        .send_json(serde_json::to_value(entries).unwrap_or_default())
        .is_ok()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn snapshot(json: &str) -> Snapshot {
        serde_json::from_str(json).expect("valid snapshot")
    }

    fn ids(entries: &[ImportEntry]) -> Vec<&str> {
        entries.iter().map(|e| e.id.as_str()).collect()
    }

    const REVIEWER_THREAD: &str = r#"{"version":2,"threads":[{"id":"t1","filePath":"a.rs",
        "position":{"side":"new","line":1},
        "messages":[{"id":"m1","body":"why?","author":"jpsyx"}]}]}"#;

    /// The reviewer's live comment, mirrored to disk by the poller.
    const MIRRORED: &str = r#"[{"type":"thread","id":"m1","filePath":"a.rs",
        "position":{"side":"new","line":1},"body":"why?","author":"jpsyx"}]"#;

    /// The skill's round-1 write: it preserves the reviewer's comment and
    /// appends its own explainer thread.
    const SKILL_WRITE: &str = r#"[
      {"type":"thread","id":"m1","filePath":"a.rs","position":{"side":"new","line":1},
       "body":"why?","author":"jpsyx"},
      {"type":"thread","id":"claude-r1-a-7","filePath":"a.rs","position":{"side":"new","line":7},
       "body":"This guards the empty case.","author":"claude",
       "createdAt":"2026-08-07T10:00:00Z","updatedAt":"2026-08-07T10:00:00Z"}
    ]"#;

    #[test]
    fn a_skill_write_imports_only_what_difit_has_not_seen() {
        let seen = snapshot_ids(&snapshot(REVIEWER_THREAD));

        let inbound = inbound_entries(SKILL_WRITE, Some(MIRRORED), &seen);

        assert_eq!(ids(&inbound), ["claude-r1-a-7"]);
        assert_eq!(inbound[0].author.as_deref(), Some("claude"));
        assert_eq!(inbound[0].file_path.as_deref(), Some("a.rs"));
    }

    #[test]
    fn the_polls_own_mirror_write_imports_nothing() {
        let seen = snapshot_ids(&snapshot(REVIEWER_THREAD));

        assert!(inbound_entries(MIRRORED, Some(MIRRORED), &seen).is_empty());
    }

    #[test]
    fn a_prepared_transcript_at_launch_imports_nothing() {
        // First tick of a resumed review: nothing was mirrored yet, but difit
        // was seeded with this very transcript via `--comment`.
        let seen = snapshot_ids(&snapshot(REVIEWER_THREAD));

        assert!(inbound_entries(MIRRORED, None, &seen).is_empty());
    }

    #[test]
    fn every_entry_of_a_transcript_difit_never_saw_is_imported_in_file_order() {
        let inbound = inbound_entries(SKILL_WRITE, None, &HashSet::new());

        assert_eq!(ids(&inbound), ["m1", "claude-r1-a-7"]);
    }

    #[test]
    fn a_deleted_comment_is_never_resurrected_by_a_stale_file() {
        // The reviewer deleted m1 in the browser, so difit no longer holds it —
        // but a transcript written just before the delete still names it.
        let mut seen = snapshot_ids(&snapshot(REVIEWER_THREAD));
        seen.insert("claude-r1-a-7".to_owned()); // already imported earlier

        assert!(inbound_entries(SKILL_WRITE, Some(MIRRORED), &seen).is_empty());
    }

    #[test]
    fn unplaceable_entries_never_poison_the_batch() {
        let text = r#"[{"type":"thread","id":"","filePath":"a.rs","position":null,"body":"no id"},
            {"type":"thread","id":"orphan","filePath":null,"position":null,"body":"no file"},
            {"type":"thread","id":"good","filePath":"a.rs",
             "position":{"side":"new","line":3},"body":"keep","author":"claude"}]"#;

        assert_eq!(ids(&inbound_entries(text, None, &HashSet::new())), ["good"]);
    }

    #[test]
    fn a_half_written_transcript_is_skipped_until_it_parses() {
        let seen = HashSet::new();
        assert!(inbound_entries(r#"[{"type":"thread","id":"m1","#, None, &seen).is_empty());
        assert!(inbound_entries("", None, &seen).is_empty());
        assert!(inbound_entries("[]", None, &seen).is_empty());
    }

    #[test]
    fn snapshot_ids_fall_back_to_the_thread_id() {
        let snap = snapshot(
            r#"{"version":1,"threads":[{"id":"t9","filePath":"a.rs","position":null,
                "messages":[{"body":"x"}]}]}"#,
        );

        assert_eq!(snapshot_ids(&snap), HashSet::from(["t9".to_owned()]));
    }
}
