//! The difit comment shapes and the server→import conversion.
//!
//! difit's `GET /api/comments-json` returns an internal `{version, threads}`
//! shape; the on-disk transcript and the `--comment` / `POST
//! /api/comment-imports` payloads use a flat *import* shape (one `thread`
//! entry per thread root, one `reply` entry per subsequent message). This
//! module models both and converts between them.
//!
//! Ported from the retired `difit-watch.py` (`thread_to_imports` /
//! `snapshot_to_imports`), preserving its field-omission rules so the
//! transcript stays byte-stable and re-injectable.

use serde::{Deserialize, Serialize};
use serde_json::Value;

/// The full `/api/comments-json` payload.
#[derive(Debug, Clone, Deserialize)]
pub struct Snapshot {
    /// Monotonic version, bumped by difit on every comment change.
    pub version: i64,
    /// Comment threads, newest difit state.
    #[serde(default)]
    pub threads: Vec<ServerThread>,
}

/// One server-internal thread.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ServerThread {
    pub id: Option<String>,
    pub file_path: Option<String>,
    pub position: Option<Value>,
    pub code_snapshot: Option<Value>,
    #[serde(default)]
    pub messages: Vec<ServerMessage>,
}

/// One message within a thread.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ServerMessage {
    pub id: Option<String>,
    #[serde(default)]
    pub body: String,
    pub author: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

/// One entry in the flat import shape (transcript / `--comment` / POST body).
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportEntry {
    /// `"thread"` for a thread root, `"reply"` for a follow-up message.
    #[serde(rename = "type")]
    pub entry_type: String,
    pub id: String,
    pub file_path: Option<String>,
    pub position: Option<Value>,
    pub body: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub author: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub code_snapshot: Option<Value>,
}

/// The author difit's browser stamps on hand-typed reviewer comments. We
/// relabel it to the configured reviewer handle so the reviewer's own comments
/// are attributed to them (e.g. `jpsyx`) rather than this generic default.
const DIFIT_DEFAULT_AUTHOR: &str = "User";

/// The reviewer handle used to attribute the reviewer's own comments.
///
/// Resolved at runtime from the `DIFF_REVIEW_REVIEWER` env var (set by `run.sh`
/// from `scripts/get-reviewer-name.sh`), defaulting to `"reviewer"` when
/// unset/empty. Never hardcoded to a person.
#[must_use]
pub fn reviewer_name() -> String {
    std::env::var("DIFF_REVIEW_REVIEWER")
        .ok()
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| "reviewer".to_owned())
}

/// Normalize a message author: drop empty strings (per difit's normalizer) and
/// relabel difit's generic default author to `reviewer`. `claude` and any other
/// explicit author pass through unchanged.
fn author_for(author: Option<&str>, reviewer: &str) -> Option<String> {
    match nonempty(author) {
        Some(a) if a == DIFIT_DEFAULT_AUTHOR => Some(reviewer.to_owned()),
        other => other,
    }
}

/// Flatten one thread into import entries, attributing the reviewer's own
/// comments to `reviewer`.
///
/// The first message becomes the `thread` entry (carrying the thread's
/// file/position/snapshot); each later message becomes a `reply` that inherits
/// the thread's file + position.
#[must_use]
pub fn thread_to_imports(thread: &ServerThread, reviewer: &str) -> Vec<ImportEntry> {
    let mut entries = Vec::with_capacity(thread.messages.len());
    for (index, message) in thread.messages.iter().enumerate() {
        let id = message
            .id
            .clone()
            .or_else(|| thread.id.clone())
            .unwrap_or_default();
        entries.push(ImportEntry {
            entry_type: if index == 0 { "thread" } else { "reply" }.to_owned(),
            id,
            file_path: thread.file_path.clone(),
            position: thread.position.clone(),
            body: message.body.clone(),
            author: author_for(message.author.as_deref(), reviewer),
            created_at: nonempty(message.created_at.as_deref()),
            updated_at: nonempty(message.updated_at.as_deref()),
            code_snapshot: if index == 0 {
                thread.code_snapshot.clone()
            } else {
                None
            },
        });
    }
    entries
}

/// Convert a full snapshot to the flat import list. Resolves the reviewer handle
/// once (see [`reviewer_name`]) and applies it to every thread.
#[must_use]
pub fn snapshot_to_imports(snapshot: &Snapshot) -> Vec<ImportEntry> {
    let reviewer = reviewer_name();
    snapshot
        .threads
        .iter()
        .flat_map(|thread| thread_to_imports(thread, &reviewer))
        .collect()
}

/// `Some(s)` only when `s` is present and non-empty — matches difit's
/// normalizer, which rejects empty author/timestamp strings.
fn nonempty(value: Option<&str>) -> Option<String> {
    value.filter(|s| !s.is_empty()).map(ToOwned::to_owned)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn snapshot_from(json: &str) -> Snapshot {
        serde_json::from_str(json).expect("valid snapshot json")
    }

    #[test]
    fn first_message_is_thread_rest_are_replies() {
        let snap = snapshot_from(
            r#"{"version":3,"threads":[{
                "id":"t1","filePath":"a.rs","position":{"side":"new","line":42},
                "messages":[
                  {"id":"m1","body":"why?","author":"reviewer","createdAt":"2026-01-01T00:00:00Z","updatedAt":"2026-01-01T00:00:00Z"},
                  {"id":"m2","body":"because","author":"claude","createdAt":"2026-01-01T00:01:00Z","updatedAt":"2026-01-01T00:01:00Z"}
                ]}]}"#,
        );
        let imports = snapshot_to_imports(&snap);
        assert_eq!(imports.len(), 2);
        assert_eq!(imports[0].entry_type, "thread");
        assert_eq!(imports[0].id, "m1");
        assert_eq!(imports[0].author.as_deref(), Some("reviewer"));
        assert_eq!(imports[1].entry_type, "reply");
        assert_eq!(imports[1].id, "m2");
        assert_eq!(imports[1].file_path.as_deref(), Some("a.rs"));
        assert_eq!(
            imports[1].position, imports[0].position,
            "reply inherits position"
        );
    }

    #[test]
    fn empty_optional_fields_are_omitted_in_serialization() {
        let snap = snapshot_from(
            r#"{"version":1,"threads":[{
                "id":"t1","filePath":"a.rs","position":{"side":"new","line":1},
                "messages":[{"id":"m1","body":"x","author":"","createdAt":"","updatedAt":""}]}]}"#,
        );
        let entry = &snapshot_to_imports(&snap)[0];
        assert_eq!(entry.author, None);
        let json = serde_json::to_string(entry).unwrap();
        assert!(
            !json.contains("author"),
            "empty author must be omitted: {json}"
        );
        assert!(
            !json.contains("createdAt"),
            "empty timestamp must be omitted"
        );
    }

    #[test]
    fn thread_id_used_when_message_id_missing() {
        let snap = snapshot_from(
            r#"{"version":1,"threads":[{
                "id":"t9","filePath":"a.rs","position":null,
                "messages":[{"body":"x"}]}]}"#,
        );
        assert_eq!(snapshot_to_imports(&snap)[0].id, "t9");
    }

    #[test]
    fn code_snapshot_only_on_thread_root() {
        let snap = snapshot_from(
            r#"{"version":1,"threads":[{
                "id":"t1","filePath":"a.rs","position":{"side":"new","line":1},
                "codeSnapshot":{"lines":["x"]},
                "messages":[{"id":"m1","body":"a"},{"id":"m2","body":"b"}]}]}"#,
        );
        let imports = snapshot_to_imports(&snap);
        assert!(imports[0].code_snapshot.is_some());
        assert!(imports[1].code_snapshot.is_none());
    }

    #[test]
    fn difit_default_author_is_relabeled_to_reviewer() {
        assert_eq!(author_for(Some("User"), "jpsyx").as_deref(), Some("jpsyx"));
    }

    #[test]
    fn claude_and_other_authors_pass_through_unchanged() {
        assert_eq!(
            author_for(Some("claude"), "jpsyx").as_deref(),
            Some("claude")
        );
        assert_eq!(author_for(Some("alice"), "jpsyx").as_deref(), Some("alice"));
    }

    #[test]
    fn empty_or_missing_author_stays_none() {
        assert_eq!(author_for(Some(""), "jpsyx"), None);
        assert_eq!(author_for(None, "jpsyx"), None);
    }

    #[test]
    fn thread_to_imports_attributes_reviewer_comments_to_handle() {
        let snap = snapshot_from(
            r#"{"version":1,"threads":[{
                "id":"t1","filePath":"a.rs","position":{"side":"new","line":7},
                "messages":[
                  {"id":"m1","body":"rename this","author":"User"},
                  {"id":"m2","body":"done","author":"claude"}
                ]}]}"#,
        );
        let entries = thread_to_imports(&snap.threads[0], "jpsyx");
        assert_eq!(entries[0].author.as_deref(), Some("jpsyx"));
        assert_eq!(entries[1].author.as_deref(), Some("claude"));
    }
}
