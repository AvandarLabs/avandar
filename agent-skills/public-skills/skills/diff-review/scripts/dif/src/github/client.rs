//! Talking to GitHub through the `gh` CLI.
//!
//! `gh` is already how the reviewer authenticates, so comments post as
//! whichever account `gh` is logged into, and `gh api` resolves the
//! `{owner}/{repo}` placeholders from the repo's remote. [`GithubApi`] is the
//! seam the sync pass is tested through; [`GhCli`] is the real implementation.

use std::io::Write;
use std::path::PathBuf;
use std::process::{Command, Stdio};

use anyhow::{Context, Result, anyhow, bail};
use serde_json::{Value, json};

use super::anchor::NewComment;
use super::registry::PullRequest;

/// A comment GitHub accepted.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Posted {
    pub id: u64,
    pub url: String,
}

/// The GitHub calls the sync pass makes.
pub trait GithubApi: Send {
    /// The open PR for the checked-out branch.
    fn resolve_pr(&self) -> Result<PullRequest>;
    /// Post a new top-level review comment.
    fn create(&self, pr: &PullRequest, comment: &NewComment) -> Result<Posted>;
    /// Reply to the review comment `in_reply_to`.
    fn reply(&self, pr: &PullRequest, in_reply_to: u64, body: &str) -> Result<Posted>;
    /// Replace a review comment's body.
    fn update(&self, github_id: u64, body: &str) -> Result<()>;
    /// Delete a review comment.
    fn delete(&self, github_id: u64) -> Result<()>;
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
        if !output.status.success() {
            bail!("{}", gh_error(&output.stderr, &output.stdout));
        }
        Ok(String::from_utf8_lossy(&output.stdout).into_owned())
    }

    fn api(&self, method: &str, path: &str, input: Option<&Value>) -> Result<String> {
        let mut args = vec!["api", "--method", method, path];
        if input.is_some() {
            args.extend(["--input", "-"]);
        }
        self.run(&args, input)
    }
}

impl GithubApi for GhCli {
    fn resolve_pr(&self) -> Result<PullRequest> {
        let out = self.run(
            &["pr", "view", "--json", "number,url,headRefOid,state"],
            None,
        )?;
        parse_pr(&out)
    }

    fn create(&self, pr: &PullRequest, comment: &NewComment) -> Result<Posted> {
        let path = format!("repos/{{owner}}/{{repo}}/pulls/{}/comments", pr.number);
        parse_posted(&self.api("POST", &path, Some(&create_payload(pr, comment)))?)
    }

    fn reply(&self, pr: &PullRequest, in_reply_to: u64, body: &str) -> Result<Posted> {
        let path = format!(
            "repos/{{owner}}/{{repo}}/pulls/{}/comments/{in_reply_to}/replies",
            pr.number
        );
        parse_posted(&self.api("POST", &path, Some(&json!({ "body": body })))?)
    }

    fn update(&self, github_id: u64, body: &str) -> Result<()> {
        let path = format!("repos/{{owner}}/{{repo}}/pulls/comments/{github_id}");
        self.api("PATCH", &path, Some(&json!({ "body": body })))
            .map(drop)
    }

    fn delete(&self, github_id: u64) -> Result<()> {
        let path = format!("repos/{{owner}}/{{repo}}/pulls/comments/{github_id}");
        match self.api("DELETE", &path, None) {
            // Already gone on GitHub: the PR matches difit, which is the goal.
            Err(e) if e.to_string().contains("Not Found") => Ok(()),
            other => other.map(drop),
        }
    }
}

/// The JSON body for `POST /pulls/{n}/comments`.
#[must_use]
pub fn create_payload(pr: &PullRequest, comment: &NewComment) -> Value {
    let mut payload = json!({
        "body": comment.body,
        "commit_id": pr.head_sha,
        "path": comment.path,
        "line": comment.line,
        "side": comment.side.as_github(),
    });
    if let Some(start_line) = comment.start_line {
        payload["start_line"] = json!(start_line);
        payload["start_side"] = json!(comment.side.as_github());
    }
    payload
}

/// Read `gh pr view --json number,url,headRefOid,state`. Only an open PR can
/// take new review comments.
pub fn parse_pr(stdout: &str) -> Result<PullRequest> {
    let value: Value = serde_json::from_str(stdout).context("reading gh pr view output")?;
    if value.get("state").and_then(Value::as_str) != Some("OPEN") {
        bail!("This branch's PR is not open.");
    }
    let field = |name: &str| {
        value
            .get(name)
            .cloned()
            .ok_or_else(|| anyhow!("gh pr view did not report {name}"))
    };
    Ok(PullRequest {
        number: field("number")?.as_u64().context("PR number")?,
        url: field("url")?.as_str().unwrap_or_default().to_owned(),
        head_sha: field("headRefOid")?.as_str().unwrap_or_default().to_owned(),
    })
}

/// Read the `id` and `html_url` of a comment GitHub created.
pub fn parse_posted(stdout: &str) -> Result<Posted> {
    let value: Value = serde_json::from_str(stdout).context("reading GitHub's response")?;
    Ok(Posted {
        id: value
            .get("id")
            .and_then(Value::as_u64)
            .context("GitHub's response had no comment id")?,
        url: value
            .get("html_url")
            .and_then(Value::as_str)
            .unwrap_or_default()
            .to_owned(),
    })
}

/// The most useful line of a failed `gh` call: GitHub's own `message` (and its
/// first validation error) when stdout carries the API's JSON, else stderr.
fn gh_error(stderr: &[u8], stdout: &[u8]) -> String {
    if let Ok(value) = serde_json::from_slice::<Value>(stdout) {
        if let Some(message) = value.get("message").and_then(Value::as_str) {
            let detail = value
                .pointer("/errors/0")
                .map(|e| e.as_str().map_or_else(|| e.to_string(), str::to_owned));
            return detail.map_or_else(|| message.to_owned(), |d| format!("{message}: {d}"));
        }
    }
    String::from_utf8_lossy(stderr).trim().to_owned()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::github::anchor::Side;

    fn pr() -> PullRequest {
        PullRequest {
            number: 7,
            url: "https://github.com/o/r/pull/7".to_owned(),
            head_sha: "abc123".to_owned(),
        }
    }

    #[test]
    fn create_payload_anchors_a_range() {
        let payload = create_payload(
            &pr(),
            &NewComment {
                path: "src/a.rs".to_owned(),
                body: "why?".to_owned(),
                side: Side::Right,
                line: 12,
                start_line: Some(10),
            },
        );
        assert_eq!(payload["commit_id"], "abc123");
        assert_eq!(payload["line"], 12);
        assert_eq!(payload["side"], "RIGHT");
        assert_eq!(payload["start_line"], 10);
        assert_eq!(payload["start_side"], "RIGHT");
    }

    #[test]
    fn create_payload_single_line_has_no_start() {
        let payload = create_payload(
            &pr(),
            &NewComment {
                path: "a.rs".to_owned(),
                body: "x".to_owned(),
                side: Side::Left,
                line: 3,
                start_line: None,
            },
        );
        assert_eq!(payload["side"], "LEFT");
        assert!(payload.get("start_line").is_none());
    }

    #[test]
    fn parses_an_open_pr() {
        let parsed = parse_pr(
            r#"{"number":7,"url":"https://github.com/o/r/pull/7","headRefOid":"abc123","state":"OPEN"}"#,
        )
        .unwrap();
        assert_eq!(parsed, pr());
    }

    #[test]
    fn rejects_a_closed_pr() {
        let err =
            parse_pr(r#"{"number":7,"url":"u","headRefOid":"a","state":"MERGED"}"#).unwrap_err();
        assert!(err.to_string().contains("not open"));
    }

    #[test]
    fn parses_a_posted_comment() {
        let posted =
            parse_posted(r#"{"id":42,"html_url":"https://github.com/o/r/pull/7#discussion_r42"}"#)
                .unwrap();
        assert_eq!(posted.id, 42);
        assert!(posted.url.ends_with("r42"));
    }

    #[test]
    fn gh_error_prefers_githubs_message() {
        let stdout =
            br#"{"message":"Validation Failed","errors":["line must be part of the diff"]}"#;
        assert_eq!(
            gh_error(b"gh: Validation Failed (HTTP 422)", stdout),
            "Validation Failed: line must be part of the diff"
        );
        assert_eq!(gh_error(b"  no PR found  ", b""), "no PR found");
    }
}
