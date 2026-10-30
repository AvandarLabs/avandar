//! Where a PR-bound comment lands on GitHub: its file, diff side, and line or
//! line range, read from difit's thread `position`.
//!
//! difit anchors a thread as `{"side": "new" | "old", "line": N}` or with
//! `"line": {"start": A, "end": B}`; GitHub wants `side` `RIGHT` / `LEFT`, a
//! `line`, and a `start_line` for a range.

use serde_json::Value;

use crate::difit::imports::ServerThread;

/// Which side of the diff a comment is anchored to, in GitHub's terms.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Side {
    /// The old file (`LEFT`).
    Left,
    /// The new file (`RIGHT`).
    Right,
}

impl Side {
    /// GitHub's API spelling.
    #[must_use]
    pub const fn as_github(self) -> &'static str {
        match self {
            Self::Left => "LEFT",
            Self::Right => "RIGHT",
        }
    }
}

/// A new top-level review comment on a line or line range.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct NewComment {
    pub path: String,
    pub body: String,
    pub side: Side,
    /// The last line of the range (or the only line).
    pub line: u64,
    /// The first line of a multi-line range.
    pub start_line: Option<u64>,
}

/// The new comment for `body` anchored where `thread` is, or why it cannot be
/// anchored at all.
pub fn new_comment(thread: &ServerThread, body: &str) -> Result<NewComment, String> {
    let path = thread
        .file_path
        .clone()
        .filter(|p| !p.is_empty() && p != "<unknown file>")
        .ok_or_else(|| "The comment has no file to anchor to.".to_owned())?;
    let position = thread
        .position
        .as_ref()
        .ok_or_else(|| "The comment has no line to anchor to.".to_owned())?;
    let side = match position.get("side").and_then(Value::as_str) {
        Some("old") => Side::Left,
        _ => Side::Right,
    };
    let (start_line, line) = line_range(position.get("line"))
        .ok_or_else(|| "The comment's line could not be read.".to_owned())?;
    Ok(NewComment {
        path,
        body: body.to_owned(),
        side,
        line,
        start_line,
    })
}

/// `(start_line, line)` from a difit `line`: a number, or `{start, end}`.
fn line_range(line: Option<&Value>) -> Option<(Option<u64>, u64)> {
    let line = line?;
    if let Some(n) = line.as_u64() {
        return Some((None, n));
    }
    let start = line.get("start").and_then(Value::as_u64)?;
    let end = line.get("end").and_then(Value::as_u64)?;
    Some(((start != end).then_some(start), end))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn thread(json: &str) -> ServerThread {
        serde_json::from_str(json).expect("valid thread")
    }

    #[test]
    fn a_range_keeps_its_first_line() {
        let comment = new_comment(
            &thread(r#"{"filePath":"a.rs","position":{"side":"new","line":{"start":3,"end":5}}}"#),
            "x",
        )
        .unwrap();
        assert_eq!(
            (comment.side, comment.start_line, comment.line),
            (Side::Right, Some(3), 5)
        );
    }

    #[test]
    fn a_one_line_range_is_a_single_line() {
        let comment = new_comment(
            &thread(r#"{"filePath":"a.rs","position":{"side":"old","line":{"start":4,"end":4}}}"#),
            "x",
        )
        .unwrap();
        assert_eq!(
            (comment.side, comment.start_line, comment.line),
            (Side::Left, None, 4)
        );
    }

    #[test]
    fn difits_placeholder_file_cannot_be_anchored() {
        let err = new_comment(
            &thread(r#"{"filePath":"<unknown file>","position":{"side":"new","line":1}}"#),
            "x",
        )
        .unwrap_err();
        assert!(err.contains("no file"), "{err}");
    }
}
