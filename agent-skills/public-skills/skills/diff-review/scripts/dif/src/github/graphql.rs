//! The GitHub GraphQL documents `dif` sends, and pure parsing of the answers.
//!
//! Review drafts, threads, replies, resolving, submitting, and viewed files
//! are all GraphQL-only on GitHub (REST cannot add to a pending review or mark
//! files viewed), so the whole integration speaks GraphQL through
//! `gh api graphql`. Queries address the PR by its node id, which avoids
//! needing the owner and repo name.

use anyhow::{Context, Result, anyhow};
use serde_json::Value;

use super::anchor::Side;
use super::session::ViewedState;

/// The reviewer's pending review on a PR, if any.
pub const PENDING_REVIEW: &str = r"query($pr: ID!) {
  node(id: $pr) { ... on PullRequest {
    reviews(states: PENDING, first: 20) { nodes { id viewerDidAuthor } }
  } }
}";

/// One page of review threads (with their comments) and the PR head.
pub const THREADS: &str = r"query($pr: ID!, $after: String) {
  node(id: $pr) { ... on PullRequest {
    headRefOid
    reviewThreads(first: 100, after: $after) {
      pageInfo { hasNextPage endCursor }
      nodes {
        id isResolved path line startLine diffSide startDiffSide originalLine originalStartLine
        comments(first: 100) {
          pageInfo { hasNextPage }
          nodes { id body url createdAt updatedAt state viewerDidAuthor author { login __typename } }
        }
      }
    }
  } }
}";

/// One page of the PR's files with the viewer's viewed state.
pub const FILES: &str = r"query($pr: ID!, $after: String) {
  node(id: $pr) { ... on PullRequest {
    files(first: 100, after: $after) {
      pageInfo { hasNextPage endCursor }
      nodes { path viewerViewedState }
    }
  } }
}";

/// Start a pending review on PR `$pr` at commit `$commit`; returns its id.
pub const ADD_REVIEW: &str = r"mutation($pr: ID!, $commit: GitObjectID!) {
  addPullRequestReview(input: { pullRequestId: $pr, commitOID: $commit }) { pullRequestReview { id } }
}";

/// Open a draft thread on a line or line range in pending review `$review`;
/// returns the thread id and its first comment's id and URL.
pub const ADD_THREAD: &str = r"mutation($review: ID!, $path: String!, $body: String!, $line: Int!, $side: DiffSide!, $startLine: Int, $startSide: DiffSide) {
  addPullRequestReviewThread(input: { pullRequestReviewId: $review, path: $path, body: $body, line: $line, side: $side, startLine: $startLine, startSide: $startSide }) {
    thread { id comments(first: 1) { nodes { id url } } }
  }
}";

/// Add a draft reply to thread `$thread` in pending review `$review`; returns
/// the reply's id and URL.
pub const ADD_REPLY: &str = r"mutation($review: ID!, $thread: ID!, $body: String!) {
  addPullRequestReviewThreadReply(input: { pullRequestReviewId: $review, pullRequestReviewThreadId: $thread, body: $body }) {
    comment { id url }
  }
}";

/// Replace the body of review comment `$id`.
pub const UPDATE_COMMENT: &str = r"mutation($id: ID!, $body: String!) {
  updatePullRequestReviewComment(input: { pullRequestReviewCommentId: $id, body: $body }) { pullRequestReviewComment { id } }
}";

/// Delete review comment `$id`.
pub const DELETE_COMMENT: &str = r"mutation($id: ID!) {
  deletePullRequestReviewComment(input: { id: $id }) { clientMutationId }
}";

/// Resolve review thread `$thread`.
pub const RESOLVE_THREAD: &str = r"mutation($thread: ID!) {
  resolveReviewThread(input: { threadId: $thread }) { thread { id } }
}";

/// Submit pending review `$review` with `$event` and an optional body.
pub const SUBMIT_REVIEW: &str = r"mutation($pr: ID!, $review: ID!, $event: PullRequestReviewEvent!, $body: String) {
  submitPullRequestReview(input: { pullRequestId: $pr, pullRequestReviewId: $review, event: $event, body: $body }) { pullRequestReview { id } }
}";

/// Mark `$path` as viewed by the viewer.
pub const MARK_VIEWED: &str = r"mutation($pr: ID!, $path: String!) {
  markFileAsViewed(input: { pullRequestId: $pr, path: $path }) { clientMutationId }
}";

/// Clear the viewer's viewed mark on `$path`.
pub const UNMARK_VIEWED: &str = r"mutation($pr: ID!, $path: String!) {
  unmarkFileAsViewed(input: { pullRequestId: $pr, path: $path }) { clientMutationId }
}";

/// A comment GitHub created.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Posted {
    pub node_id: String,
    pub thread_id: String,
    pub url: String,
}

/// One comment in a GitHub review thread.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RemoteComment {
    pub node_id: String,
    pub body: String,
    pub url: String,
    /// The author as dif should show it: a login, with `[bot]` for apps.
    pub author: String,
    pub viewer_did_author: bool,
    /// Still in its author's pending review.
    pub pending: bool,
    pub created_at: String,
    pub updated_at: String,
}

/// One GitHub review thread.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RemoteThread {
    pub node_id: String,
    pub resolved: bool,
    pub path: String,
    pub side: Side,
    /// The last line of the range (falls back to the original line for an
    /// outdated thread).
    pub line: u64,
    pub start_line: Option<u64>,
    pub comments: Vec<RemoteComment>,
    /// Whether every comment was fetched (more than 100 are paged out).
    pub complete: bool,
}

/// Everything a pull reads from GitHub.
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct RemoteState {
    pub head_sha: String,
    /// Whether the viewer has a pending review on the PR.
    pub has_pending_review: bool,
    pub threads: Vec<RemoteThread>,
    pub files: Vec<(String, ViewedState)>,
}

/// The `data` of a `gh api graphql` answer, or GitHub's error message.
pub fn parse_data_from_answer(stdout: &str) -> Result<Value> {
    let value: Value = serde_json::from_str(stdout).context("reading GitHub's GraphQL answer")?;
    if let Some(message) = value.pointer("/errors/0/message").and_then(Value::as_str) {
        return Err(anyhow!("{message}"));
    }
    value
        .get("data")
        .cloned()
        .ok_or_else(|| anyhow!("GitHub's answer had no data"))
}

/// The viewer's pending review id among `PENDING_REVIEW`'s nodes.
#[must_use]
pub fn parse_pending_review(data: &Value) -> Option<String> {
    data.pointer("/node/reviews/nodes")?
        .as_array()?
        .iter()
        .find(|review| review["viewerDidAuthor"] == Value::Bool(true))
        .and_then(|review| review["id"].as_str())
        .map(str::to_owned)
}

/// The new thread and its first comment from `ADD_THREAD`.
pub fn parse_added_thread(data: &Value) -> Result<Posted> {
    let thread = data
        .pointer("/addPullRequestReviewThread/thread")
        .filter(|t| !t.is_null())
        .context("GitHub did not create the thread (is the line part of the PR's diff?)")?;
    let comment = thread
        .pointer("/comments/nodes/0")
        .context("the new thread had no comment")?;
    Ok(Posted {
        node_id: str_field(comment, "id")?,
        thread_id: str_field(thread, "id")?,
        url: comment["url"].as_str().unwrap_or_default().to_owned(),
    })
}

/// The new reply from `ADD_REPLY`, placed in `thread_id`.
pub fn parse_added_reply(data: &Value, thread_id: &str) -> Result<Posted> {
    let comment = data
        .pointer("/addPullRequestReviewThreadReply/comment")
        .filter(|c| !c.is_null())
        .context("GitHub did not create the reply")?;
    Ok(Posted {
        node_id: str_field(comment, "id")?,
        thread_id: thread_id.to_owned(),
        url: comment["url"].as_str().unwrap_or_default().to_owned(),
    })
}

/// One page of `THREADS`: the head sha, the threads, and the next cursor.
pub type ThreadsPage = (String, Vec<RemoteThread>, Option<String>);

/// Parse one page of `THREADS`.
pub fn parse_threads_page(data: &Value) -> Result<ThreadsPage> {
    let pr = data.get("node").context("the PR was not found")?;
    let head = pr["headRefOid"].as_str().unwrap_or_default().to_owned();
    let threads = pr
        .pointer("/reviewThreads/nodes")
        .and_then(Value::as_array)
        .context("GitHub returned no review threads")?
        .iter()
        .filter_map(parse_thread)
        .collect();
    Ok((head, threads, next_cursor(&pr["reviewThreads"])))
}

/// One page of `FILES`: each path's viewed state, and the next cursor.
pub type FilesPage = (Vec<(String, ViewedState)>, Option<String>);

/// Parse one page of `FILES`.
pub fn parse_files_page(data: &Value) -> Result<FilesPage> {
    let files = data
        .pointer("/node/files")
        .context("GitHub returned no PR files")?;
    let nodes = files["nodes"].as_array().cloned().unwrap_or_default();
    let parsed = nodes
        .iter()
        .filter_map(|file| {
            let path = file["path"].as_str()?.to_owned();
            let state = ViewedState::parse(file["viewerViewedState"].as_str()?)?;
            Some((path, state))
        })
        .collect();
    Ok((parsed, next_cursor(files)))
}

fn parse_thread(node: &Value) -> Option<RemoteThread> {
    let line = node["line"]
        .as_u64()
        .or_else(|| node["originalLine"].as_u64())?;
    let start_line = node["startLine"]
        .as_u64()
        .or_else(|| node["originalStartLine"].as_u64())
        .filter(|start| *start != line);
    let side = match node["diffSide"].as_str() {
        Some("LEFT") => Side::Left,
        _ => Side::Right,
    };
    let comments = node.pointer("/comments/nodes")?.as_array()?;
    Some(RemoteThread {
        node_id: node["id"].as_str()?.to_owned(),
        resolved: node["isResolved"].as_bool().unwrap_or(false),
        path: node["path"].as_str()?.to_owned(),
        side,
        line,
        start_line,
        comments: comments.iter().filter_map(parse_comment).collect(),
        complete: node.pointer("/comments/pageInfo/hasNextPage") != Some(&Value::Bool(true)),
    })
}

fn parse_comment(node: &Value) -> Option<RemoteComment> {
    let login = node
        .pointer("/author/login")
        .and_then(Value::as_str)
        .unwrap_or("ghost");
    let is_bot = node.pointer("/author/__typename").and_then(Value::as_str) == Some("Bot");
    Some(RemoteComment {
        node_id: node["id"].as_str()?.to_owned(),
        body: node["body"].as_str().unwrap_or_default().to_owned(),
        url: node["url"].as_str().unwrap_or_default().to_owned(),
        author: if is_bot && !login.ends_with("[bot]") {
            format!("{login}[bot]")
        } else {
            login.to_owned()
        },
        viewer_did_author: node["viewerDidAuthor"].as_bool().unwrap_or(false),
        pending: node["state"].as_str() == Some("PENDING"),
        created_at: node["createdAt"].as_str().unwrap_or_default().to_owned(),
        updated_at: node["updatedAt"].as_str().unwrap_or_default().to_owned(),
    })
}

fn next_cursor(connection: &Value) -> Option<String> {
    (connection.pointer("/pageInfo/hasNextPage") == Some(&Value::Bool(true)))
        .then(|| {
            connection
                .pointer("/pageInfo/endCursor")?
                .as_str()
                .map(str::to_owned)
        })
        .flatten()
}

fn str_field(value: &Value, name: &str) -> Result<String> {
    value[name]
        .as_str()
        .map(str::to_owned)
        .with_context(|| format!("GitHub's answer had no {name}"))
}

#[cfg(test)]
#[path = "graphql_tests.rs"]
mod tests;
