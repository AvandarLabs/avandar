//! Editing difit's live comments in place: adding threads and messages,
//! changing a message's body, and removing messages.
//!
//! difit's `POST /api/comment-imports` only ever appends (it skips an id it
//! already holds and attaches a reply to whichever thread shares its
//! position), so it cannot apply an edit made on GitHub or place a reply in an
//! exact thread. Instead this reads `/api/comments-json`, edits the threads,
//! and saves them back through `POST /api/comments` with the version it read,
//! the same save difit's own browser makes. difit then broadcasts the change
//! to the open browser over SSE.

use std::time::Duration;

use anyhow::{Context, Result, bail};
use serde_json::{Value, json};

/// One change to difit's comments.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum DifitEdit {
    /// Add a whole thread (difit's server shape, with its messages).
    AddThread(Value),
    /// Append a message to thread `thread_id`.
    AddMessage { thread_id: String, message: Value },
    /// Replace a message's body.
    SetBody {
        message_id: String,
        body: String,
        updated_at: String,
    },
    /// Remove a message. Removing a thread's first message removes the thread.
    Remove { message_id: String },
}

/// Applies [`DifitEdit`]s to the live difit server. The seam the GitHub sync
/// pass is tested through.
pub trait DifitEditor: Send {
    /// Apply `edits` in order.
    fn apply(&self, edits: &[DifitEdit]) -> Result<()>;
}

/// [`DifitEditor`] over difit's HTTP API on `port`.
pub struct DifitHttp {
    pub port: u16,
}

impl DifitEditor for DifitHttp {
    fn apply(&self, edits: &[DifitEdit]) -> Result<()> {
        if edits.is_empty() {
            return Ok(());
        }
        let base = format!("http://localhost:{}", self.port);
        let current: Value = ureq::get(&format!("{base}/api/comments-json"))
            .timeout(Duration::from_secs(2))
            .call()
            .context("reading difit's comments")?
            .into_json()?;
        let version = current["version"].clone();
        let mut threads = current["threads"].as_array().cloned().unwrap_or_default();
        apply_edits(&mut threads, edits);
        let response = ureq::post(&format!("{base}/api/comments"))
            .timeout(Duration::from_secs(2))
            .send_json(json!({ "threads": threads, "baseVersion": version }));
        if let Err(e) = response {
            bail!("saving difit's comments: {e}");
        }
        Ok(())
    }
}

/// Apply `edits` to difit's server-shape `threads`.
pub fn apply_edits(threads: &mut Vec<Value>, edits: &[DifitEdit]) {
    for edit in edits {
        match edit {
            DifitEdit::AddThread(thread) => {
                if find_thread(threads, thread["id"].as_str()).is_none() {
                    threads.push(thread.clone());
                }
            }
            DifitEdit::AddMessage { thread_id, message } => {
                if let Some(thread) = find_thread(threads, Some(thread_id)) {
                    append_message(thread, message);
                }
            }
            DifitEdit::SetBody {
                message_id,
                body,
                updated_at,
            } => {
                if let Some(message) = find_message(threads, message_id) {
                    message["body"] = json!(body);
                    message["updatedAt"] = json!(updated_at);
                }
            }
            DifitEdit::Remove { message_id } => remove_message(threads, message_id),
        }
    }
}

fn find_thread<'a>(threads: &'a mut [Value], id: Option<&str>) -> Option<&'a mut Value> {
    let id = id?;
    threads.iter_mut().find(|t| t["id"].as_str() == Some(id))
}

fn append_message(thread: &mut Value, message: &Value) {
    let Some(messages) = thread["messages"].as_array_mut() else {
        return;
    };
    if messages.iter().all(|m| m["id"] != message["id"]) {
        messages.push(message.clone());
    }
}

fn find_message<'a>(threads: &'a mut [Value], id: &str) -> Option<&'a mut Value> {
    threads
        .iter_mut()
        .filter_map(|t| t["messages"].as_array_mut())
        .flatten()
        .find(|m| m["id"].as_str() == Some(id))
}

fn remove_message(threads: &mut Vec<Value>, id: &str) {
    threads.retain(|t| t["messages"][0]["id"].as_str() != Some(id));
    for thread in threads.iter_mut() {
        if let Some(messages) = thread["messages"].as_array_mut() {
            messages.retain(|m| m["id"].as_str() != Some(id));
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn threads() -> Vec<Value> {
        vec![json!({
            "id": "t1", "filePath": "a.rs", "position": {"side": "new", "line": 3},
            "messages": [
                {"id": "m1", "body": "root", "author": "User"},
                {"id": "m2", "body": "reply", "author": "claude"}
            ]
        })]
    }

    #[test]
    fn adds_threads_and_messages_once() {
        let mut t = threads();
        let thread = json!({"id": "gh:C9", "filePath": "b.rs", "position": {"side": "new", "line": 1},
            "messages": [{"id": "gh:C9", "body": "hi", "author": "bot[bot]"}]});
        let message = json!({"id": "gh:C10", "body": "more", "author": "alice"});
        let edits = [
            DifitEdit::AddThread(thread.clone()),
            DifitEdit::AddThread(thread),
            DifitEdit::AddMessage {
                thread_id: "t1".to_owned(),
                message: message.clone(),
            },
            DifitEdit::AddMessage {
                thread_id: "t1".to_owned(),
                message,
            },
        ];
        apply_edits(&mut t, &edits);
        assert_eq!(t.len(), 2);
        assert_eq!(t[0]["messages"].as_array().unwrap().len(), 3);
    }

    #[test]
    fn sets_a_body() {
        let mut t = threads();
        apply_edits(
            &mut t,
            &[DifitEdit::SetBody {
                message_id: "m2".to_owned(),
                body: "edited".to_owned(),
                updated_at: "2026-10-30T00:00:00Z".to_owned(),
            }],
        );
        assert_eq!(t[0]["messages"][1]["body"], "edited");
        assert_eq!(t[0]["messages"][1]["updatedAt"], "2026-10-30T00:00:00Z");
    }

    #[test]
    fn removing_a_reply_keeps_the_thread_and_removing_a_root_drops_it() {
        let mut t = threads();
        apply_edits(
            &mut t,
            &[DifitEdit::Remove {
                message_id: "m2".to_owned(),
            }],
        );
        assert_eq!(t[0]["messages"].as_array().unwrap().len(), 1);
        apply_edits(
            &mut t,
            &[DifitEdit::Remove {
                message_id: "m1".to_owned(),
            }],
        );
        assert!(t.is_empty());
    }
}
