//! Talking to GitHub through the `gh` CLI.
//!
//! `gh` is already how the reviewer authenticates, so everything happens as
//! whichever account `gh` is logged into. [`GithubApi`] is the seam the sync
//! pass is tested through; [`GhCli`] is the real implementation, speaking
//! GraphQL (see [`graphql`](super::graphql)) via `gh api graphql`.

use std::io::Write;
use std::path::PathBuf;
use std::process::{Command, Stdio};

use anyhow::{Context, Result, anyhow, bail};
use serde_json::{Value, json};

use super::anchor::NewComment;
use super::graphql::{self, Posted, RemoteState};
use super::session::{PullRequest, ReviewEvent};

/// The GitHub calls the sync pass makes.
pub trait GithubApi: Send {
    /// The open PR for the checked-out branch.
    fn resolve_pr(&self) -> Result<PullRequest>;
    /// The `gh` account's login.
    fn viewer(&self) -> Result<String>;
    /// The viewer's pending review on `pr`, if one exists.
    fn pending_review(&self, pr: &PullRequest) -> Result<Option<String>>;
    /// Start a pending review on `pr` (GitHub's "Start a review").
    fn create_review(&self, pr: &PullRequest) -> Result<String>;
    /// Open a draft thread in pending review `review`.
    fn add_thread(&self, review: &str, comment: &NewComment) -> Result<Posted>;
    /// Add a draft reply to thread `thread_id` in pending review `review`.
    fn add_reply(&self, review: &str, thread_id: &str, body: &str) -> Result<Posted>;
    /// Replace a review comment's body.
    fn update(&self, node_id: &str, body: &str) -> Result<()>;
    /// Delete a review comment. A comment that is already gone is not an error.
    fn delete(&self, node_id: &str) -> Result<()>;
    /// Resolve a review thread.
    fn resolve(&self, thread_id: &str) -> Result<()>;
    /// Submit pending review `review`.
    fn submit(&self, pr: &PullRequest, review: &str, event: ReviewEvent, body: &str) -> Result<()>;
    /// Mark (or unmark) `path` as viewed by the viewer.
    fn set_viewed(&self, pr: &PullRequest, path: &str, viewed: bool) -> Result<()>;
    /// Every review thread, the viewer's viewed state per file, and the head.
    fn fetch(&self, pr: &PullRequest) -> Result<RemoteState>;
}

/// [`GithubApi`] over `gh`, run in the repo root.
pub struct GhCli {
    repo_root: PathBuf,
}

impl GhCli {
    /// A client that runs `gh` from `repo_root`.
    #[must_use]
    pub const fn new(repo_root: PathBuf) -> Self {
        Self { repo_root }
    }

    fn run(&self, args: &[&str], input: Option<&Value>) -> Result<String> {
        let mut child = Command::new("gh")
            .args(args)
            .current_dir(&self.repo_root)
            .stdin(if input.is_some() {
                Stdio::piped()
            } else {
                Stdio::null()
            })
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .context("running gh (is the GitHub CLI installed?)")?;
        if let (Some(input), Some(mut stdin)) = (input, child.stdin.take()) {
            stdin.write_all(input.to_string().as_bytes())?;
        }
        let output = child.wait_with_output()?;
        let stdout = String::from_utf8_lossy(&output.stdout).into_owned();
        if !output.status.success() {
            if let Err(e) = graphql::data(&stdout) {
                bail!("{e}");
            }
            bail!("{}", String::from_utf8_lossy(&output.stderr).trim());
        }
        Ok(stdout)
    }

    fn graphql(&self, query: &str, variables: &Value) -> Result<Value> {
        let body = json!({ "query": query, "variables": variables });
        graphql::data(&self.run(&["api", "graphql", "--input", "-"], Some(&body))?)
    }

    fn paged<T>(
        &self,
        query: &str,
        pr: &PullRequest,
        mut page: impl FnMut(&Value) -> Result<(Vec<T>, Option<String>)>,
    ) -> Result<Vec<T>> {
        let mut items = Vec::new();
        let mut after: Option<String> = None;
        loop {
            let data = self.graphql(query, &json!({ "pr": pr.node_id, "after": after }))?;
            let (batch, next) = page(&data)?;
            items.extend(batch);
            match next {
                Some(cursor) => after = Some(cursor),
                None => return Ok(items),
            }
        }
    }
}

impl GithubApi for GhCli {
    fn resolve_pr(&self) -> Result<PullRequest> {
        let fields = "number,url,id,headRefOid,state,baseRefName,author";
        parse_pr(&self.run(&["pr", "view", "--json", fields], None)?)
    }

    fn viewer(&self) -> Result<String> {
        Ok(self
            .run(&["api", "user", "--jq", ".login"], None)?
            .trim()
            .to_owned())
    }

    fn pending_review(&self, pr: &PullRequest) -> Result<Option<String>> {
        let data = self.graphql(graphql::PENDING_REVIEW, &json!({ "pr": pr.node_id }))?;
        Ok(graphql::parse_pending_review(&data))
    }

    fn create_review(&self, pr: &PullRequest) -> Result<String> {
        let variables = json!({ "pr": pr.node_id, "commit": pr.head_sha });
        self.graphql(graphql::ADD_REVIEW, &variables)?
            .pointer("/addPullRequestReview/pullRequestReview/id")
            .and_then(Value::as_str)
            .map(str::to_owned)
            .context("GitHub did not start a review")
    }

    fn add_thread(&self, review: &str, comment: &NewComment) -> Result<Posted> {
        let data = self.graphql(graphql::ADD_THREAD, &thread_variables(review, comment))?;
        graphql::parse_added_thread(&data)
    }

    fn add_reply(&self, review: &str, thread_id: &str, body: &str) -> Result<Posted> {
        let variables = json!({ "review": review, "thread": thread_id, "body": body });
        graphql::parse_added_reply(&self.graphql(graphql::ADD_REPLY, &variables)?, thread_id)
    }

    fn update(&self, node_id: &str, body: &str) -> Result<()> {
        let variables = json!({ "id": node_id, "body": body });
        self.graphql(graphql::UPDATE_COMMENT, &variables).map(drop)
    }

    fn delete(&self, node_id: &str) -> Result<()> {
        match self.graphql(graphql::DELETE_COMMENT, &json!({ "id": node_id })) {
            Err(e) if is_gone(&e) => Ok(()),
            other => other.map(drop),
        }
    }

    fn resolve(&self, thread_id: &str) -> Result<()> {
        self.graphql(graphql::RESOLVE_THREAD, &json!({ "thread": thread_id }))
            .map(drop)
    }

    fn submit(&self, pr: &PullRequest, review: &str, event: ReviewEvent, body: &str) -> Result<()> {
        let body = (!body.trim().is_empty()).then_some(body);
        let variables = json!({
            "pr": pr.node_id,
            "review": review,
            "event": event.as_github(),
            "body": body,
        });
        self.graphql(graphql::SUBMIT_REVIEW, &variables).map(drop)
    }

    fn set_viewed(&self, pr: &PullRequest, path: &str, viewed: bool) -> Result<()> {
        let query = if viewed {
            graphql::MARK_VIEWED
        } else {
            graphql::UNMARK_VIEWED
        };
        self.graphql(query, &json!({ "pr": pr.node_id, "path": path }))
            .map(drop)
    }

    fn fetch(&self, pr: &PullRequest) -> Result<RemoteState> {
        let mut head_sha = String::new();
        let threads = self.paged(graphql::THREADS, pr, |data| {
            let (head, threads, next) = graphql::parse_threads_page(data)?;
            head_sha = head;
            Ok((threads, next))
        })?;
        let files = self.paged(graphql::FILES, pr, graphql::parse_files_page)?;
        Ok(RemoteState {
            has_pending_review: self.pending_review(pr)?.is_some(),
            head_sha,
            threads,
            files,
        })
    }
}

/// The variables for `ADD_THREAD`, with the range fields only for a range.
#[must_use]
pub fn thread_variables(review: &str, comment: &NewComment) -> Value {
    let mut variables = json!({
        "review": review,
        "path": comment.path,
        "body": comment.body,
        "line": comment.line,
        "side": comment.side.as_github(),
    });
    if let Some(start_line) = comment.start_line {
        variables["startLine"] = json!(start_line);
        variables["startSide"] = json!(comment.side.as_github());
    }
    variables
}

/// Read `gh pr view --json number,url,id,headRefOid,state,baseRefName,author`.
/// Only an open PR can take review comments.
pub fn parse_pr(stdout: &str) -> Result<PullRequest> {
    let value: Value = serde_json::from_str(stdout).context("reading gh pr view output")?;
    if value.get("state").and_then(Value::as_str) != Some("OPEN") {
        bail!("This branch's PR is not open.");
    }
    let text = |pointer: &str| {
        value
            .pointer(pointer)
            .and_then(Value::as_str)
            .map(str::to_owned)
            .ok_or_else(|| anyhow!("gh pr view did not report {pointer}"))
    };
    Ok(PullRequest {
        number: value["number"].as_u64().context("PR number")?,
        url: text("/url")?,
        node_id: text("/id")?,
        head_sha: text("/headRefOid")?,
        base_ref: text("/baseRefName")?,
        author: text("/author/login")?,
    })
}

/// Whether a GitHub error means the target no longer exists.
fn is_gone(error: &anyhow::Error) -> bool {
    let text = error.to_string();
    text.contains("Could not resolve to a node") || text.contains("Not Found")
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::github::anchor::Side;

    #[test]
    fn thread_variables_anchor_a_range() {
        let variables = thread_variables(
            "R1",
            &NewComment {
                path: "src/a.rs".to_owned(),
                body: "why?".to_owned(),
                side: Side::Right,
                line: 12,
                start_line: Some(10),
            },
        );
        assert_eq!(variables["review"], "R1");
        assert_eq!(variables["line"], 12);
        assert_eq!(variables["side"], "RIGHT");
        assert_eq!(variables["startLine"], 10);
        assert_eq!(variables["startSide"], "RIGHT");
    }

    #[test]
    fn thread_variables_single_line_has_no_start() {
        let variables = thread_variables(
            "R1",
            &NewComment {
                path: "a.rs".to_owned(),
                body: "x".to_owned(),
                side: Side::Left,
                line: 3,
                start_line: None,
            },
        );
        assert_eq!(variables["side"], "LEFT");
        assert!(variables.get("startLine").is_none());
    }

    #[test]
    fn parses_an_open_pr() {
        let pr = parse_pr(
            r#"{"number":7,"url":"https://github.com/o/r/pull/7","id":"PR_1","headRefOid":"abc",
                "state":"OPEN","baseRefName":"develop","author":{"login":"alice"}}"#,
        )
        .unwrap();
        assert_eq!(
            (
                pr.number,
                pr.node_id.as_str(),
                pr.base_ref.as_str(),
                pr.author.as_str()
            ),
            (7, "PR_1", "develop", "alice")
        );
    }

    #[test]
    fn rejects_a_closed_pr() {
        let err = parse_pr(r#"{"number":7,"state":"MERGED"}"#).unwrap_err();
        assert!(err.to_string().contains("not open"));
    }

    #[test]
    fn a_missing_node_counts_as_gone() {
        assert!(is_gone(&anyhow!(
            "Could not resolve to a node with the global id of 'X'"
        )));
        assert!(!is_gone(&anyhow!("Validation Failed")));
    }
}
