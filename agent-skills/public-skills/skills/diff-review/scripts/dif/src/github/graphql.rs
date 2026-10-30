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

pub const ADD_REVIEW: &str = r"mutation($pr: ID!, $commit: GitObjectID!) {
  addPullRequestReview(input: { pullRequestId: $pr, commitOID: $commit }) { pullRequestReview { id } }
}";

pub const ADD_THREAD: &str = r"mutation($review: ID!, $path: String!, $body: String!, $line: Int!, $side: DiffSide!, $startLine: Int, $startSide: DiffSide) {
  addPullRequestReviewThread(input: { pullRequestReviewId: $review, path: $path, body: $body, line: $line, side: $side, startLine: $startLine, startSide: $startSide }) {
    thread { id comments(first: 1) { nodes { id url } } }
  }
}";

pub const ADD_REPLY: &str = r"mutation($review: ID!, $thread: ID!, $body: String!) {
  addPullRequestReviewThreadReply(input: { pullRequestReviewId: $review, pullRequestReviewThreadId: $thread, body: $body }) {
    comment { id url }
  }
}";

pub const UPDATE_COMMENT: &str = r"mutation($id: ID!, $body: String!) {
  updatePullRequestReviewComment(input: { pullRequestReviewCommentId: $id, body: $body }) { pullRequestReviewComment { id } }
}";

pub const DELETE_COMMENT: &str = r"mutation($id: ID!) {
  deletePullRequestReviewComment(input: { id: $id }) { clientMutationId }
}";

pub const RESOLVE_THREAD: &str = r"mutation($thread: ID!) {
  resolveReviewThread(input: { threadId: $thread }) { thread { id } }
}";

pub const SUBMIT_REVIEW: &str = r"mutation($pr: ID!, $review: ID!, $event: PullRequestReviewEvent!, $body: String) {
  submitPullRequestReview(input: { pullRequestId: $pr, pullRequestReviewId: $review, event: $event, body: $body }) { pullRequestReview { id } }
}";

pub const MARK_VIEWED: &str = r"mutation($pr: ID!, $path: String!) {
  markFileAsViewed(input: { pullRequestId: $pr, path: $path }) { clientMutationId }
}";

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
pub fn data(stdout: &str) -> Result<Value> {
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
mod tests {
    use serde_json::json;

    use super::*;

    #[test]
    fn graphql_errors_become_errors() {
        let err = data(r#"{"data":null,"errors":[{"message":"Line could not be resolved"}]}"#)
            .unwrap_err();
        assert_eq!(err.to_string(), "Line could not be resolved");
        assert_eq!(data(r#"{"data":{"x":1}}"#).unwrap()["x"], 1);
    }

    #[test]
    fn finds_only_the_viewers_pending_review() {
        let answer = json!({"node":{"reviews":{"nodes":[
            {"id":"R_other","viewerDidAuthor":false},
            {"id":"R_mine","viewerDidAuthor":true}]}}});
        assert_eq!(parse_pending_review(&answer).as_deref(), Some("R_mine"));
        assert_eq!(
            parse_pending_review(&json!({"node":{"reviews":{"nodes":[]}}})),
            None
        );
    }

    #[test]
    fn parses_a_new_thread_and_reply() {
        let thread = json!({"addPullRequestReviewThread":{"thread":{"id":"T1",
            "comments":{"nodes":[{"id":"C1","url":"https://x/1"}]}}}});
        assert_eq!(
            parse_added_thread(&thread).unwrap(),
            Posted {
                node_id: "C1".to_owned(),
                thread_id: "T1".to_owned(),
                url: "https://x/1".to_owned(),
            }
        );
        let missing = json!({"addPullRequestReviewThread":{"thread":null}});
        assert!(
            parse_added_thread(&missing)
                .unwrap_err()
                .to_string()
                .contains("part of the PR")
        );

        let reply = json!({"addPullRequestReviewThreadReply":{"comment":{"id":"C2","url":"u"}}});
        assert_eq!(parse_added_reply(&reply, "T1").unwrap().thread_id, "T1");
    }

    #[test]
    fn parses_threads_with_bots_ranges_and_outdated_lines() {
        let answer = json!({"node":{"headRefOid":"abc","reviewThreads":{
            "pageInfo":{"hasNextPage":true,"endCursor":"CUR"},
            "nodes":[
              {"id":"T1","isResolved":false,"path":"a.rs","line":12,"startLine":10,
               "diffSide":"RIGHT","originalLine":12,"originalStartLine":10,
               "comments":{"pageInfo":{"hasNextPage":false},"nodes":[
                 {"id":"C1","body":"nit","url":"u1","createdAt":"t0","updatedAt":"t1",
                  "state":"SUBMITTED","viewerDidAuthor":false,
                  "author":{"login":"coderabbitai","__typename":"Bot"}},
                 {"id":"C2","body":"draft","url":"u2","createdAt":"t0","updatedAt":"t1",
                  "state":"PENDING","viewerDidAuthor":true,
                  "author":{"login":"jpsyx","__typename":"User"}}]}},
              {"id":"T2","isResolved":true,"path":"b.rs","line":null,"startLine":null,
               "diffSide":"LEFT","originalLine":4,"originalStartLine":4,
               "comments":{"pageInfo":{"hasNextPage":true},"nodes":[]}}]}}});
        let (head, threads, cursor) = parse_threads_page(&answer).unwrap();
        assert_eq!(head, "abc");
        assert_eq!(cursor.as_deref(), Some("CUR"));
        assert_eq!((threads[0].start_line, threads[0].line), (Some(10), 12));
        assert_eq!(threads[0].comments[0].author, "coderabbitai[bot]");
        assert!(threads[0].comments[1].pending && threads[0].comments[1].viewer_did_author);
        assert_eq!(
            (threads[1].side, threads[1].line, threads[1].start_line),
            (Side::Left, 4, None)
        );
        assert!(threads[1].resolved && !threads[1].complete);
    }

    #[test]
    fn parses_viewed_files() {
        let answer = json!({"node":{"files":{"pageInfo":{"hasNextPage":false},"nodes":[
            {"path":"a.rs","viewerViewedState":"VIEWED"},
            {"path":"b.rs","viewerViewedState":"DISMISSED"}]}}});
        let (files, cursor) = parse_files_page(&answer).unwrap();
        assert_eq!(
            files,
            vec![
                ("a.rs".to_owned(), ViewedState::Viewed),
                ("b.rs".to_owned(), ViewedState::Dismissed)
            ]
        );
        assert_eq!(cursor, None);
    }
}
