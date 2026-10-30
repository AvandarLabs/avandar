//! Test doubles for the GitHub sync pass: a stateful GitHub, a checkout, and
//! a difit editor that only record and simulate.

use std::sync::{Arc, Mutex};

use anyhow::{Result, bail};

use crate::difit::editor::{DifitEdit, DifitEditor};
use crate::github::anchor::NewComment;
use crate::github::checkout::{Checkout, Relation};
use crate::github::client::GithubApi;
use crate::github::graphql::{Posted, RemoteComment, RemoteState, RemoteThread};
use crate::github::session::{PullRequest, ReviewEvent};

type Log = Arc<Mutex<Vec<String>>>;

/// A stateful stand-in for GitHub: it keeps the pending review and every
/// thread added to it, like the real PR would.
#[derive(Clone, Default)]
pub struct FakeGithub {
    pub log: Log,
    pub no_pr: bool,
    pub author: Option<String>,
    pub fail_thread: bool,
    pub review: Arc<Mutex<Option<String>>>,
    pub remote: Arc<Mutex<RemoteState>>,
}

impl FakeGithub {
    pub fn calls(&self) -> Vec<String> {
        self.log.lock().unwrap().clone()
    }
    fn note(&self, call: impl Into<String>) {
        self.log.lock().unwrap().push(call.into());
    }
    fn comment(node: &str, body: &str) -> RemoteComment {
        RemoteComment {
            node_id: node.to_owned(),
            body: body.to_owned(),
            url: format!("https://x/{node}"),
            author: "jpsyx".to_owned(),
            viewer_did_author: true,
            pending: true,
            created_at: "t0".to_owned(),
            updated_at: "t0".to_owned(),
        }
    }
    fn each_comment(&self, mut change: impl FnMut(&mut RemoteThread, usize)) {
        let mut remote = self.remote.lock().unwrap();
        for thread in &mut remote.threads {
            for index in 0..thread.comments.len() {
                change(thread, index);
            }
        }
    }
}

impl GithubApi for FakeGithub {
    fn resolve_pr(&self) -> Result<PullRequest> {
        if self.no_pr {
            bail!("no pull requests found for branch \"feat/x\"");
        }
        Ok(PullRequest {
            number: 7,
            url: "https://github.com/o/r/pull/7".to_owned(),
            node_id: "PR_7".to_owned(),
            head_sha: "head".to_owned(),
            base_ref: "develop".to_owned(),
            author: self.author.clone().unwrap_or_else(|| "alice".to_owned()),
        })
    }
    fn viewer(&self) -> Result<String> {
        Ok("jpsyx".to_owned())
    }
    fn pending_review(&self, _pr: &PullRequest) -> Result<Option<String>> {
        Ok(self.review.lock().unwrap().clone())
    }
    fn create_review(&self, _pr: &PullRequest) -> Result<String> {
        self.note("create_review");
        *self.review.lock().unwrap() = Some("R1".to_owned());
        Ok("R1".to_owned())
    }
    fn add_thread(&self, review: &str, comment: &NewComment) -> Result<Posted> {
        self.note(format!(
            "add_thread {review} {}:{}",
            comment.path, comment.line
        ));
        if self.fail_thread {
            bail!("Line could not be resolved");
        }
        self.remote.lock().unwrap().threads.push(RemoteThread {
            node_id: "T1".to_owned(),
            resolved: false,
            path: comment.path.clone(),
            side: comment.side,
            line: comment.line,
            start_line: comment.start_line,
            comments: vec![Self::comment("C1", &comment.body)],
            complete: true,
        });
        Ok(Posted {
            node_id: "C1".to_owned(),
            thread_id: "T1".to_owned(),
            url: "https://x/C1".to_owned(),
        })
    }
    fn add_reply(&self, review: &str, thread_id: &str, body: &str) -> Result<Posted> {
        self.note(format!("add_reply {review} {thread_id}"));
        let mut remote = self.remote.lock().unwrap();
        if let Some(thread) = remote.threads.iter_mut().find(|t| t.node_id == thread_id) {
            thread.comments.push(Self::comment("C2", body));
        }
        drop(remote);
        Ok(Posted {
            node_id: "C2".to_owned(),
            thread_id: thread_id.to_owned(),
            url: "https://x/C2".to_owned(),
        })
    }
    fn update(&self, node_id: &str, body: &str) -> Result<()> {
        self.note(format!("update {node_id} {body}"));
        self.each_comment(|thread, index| {
            if thread.comments[index].node_id == node_id {
                body.clone_into(&mut thread.comments[index].body);
            }
        });
        Ok(())
    }
    fn delete(&self, node_id: &str) -> Result<()> {
        self.note(format!("delete {node_id}"));
        for thread in &mut self.remote.lock().unwrap().threads {
            thread.comments.retain(|c| c.node_id != node_id);
        }
        Ok(())
    }
    fn resolve(&self, thread_id: &str) -> Result<()> {
        self.note(format!("resolve {thread_id}"));
        for thread in &mut self.remote.lock().unwrap().threads {
            if thread.node_id == thread_id {
                thread.resolved = true;
            }
        }
        Ok(())
    }
    fn submit(
        &self,
        _pr: &PullRequest,
        review: &str,
        event: ReviewEvent,
        body: &str,
    ) -> Result<()> {
        self.note(format!("submit {review} {} {body}", event.as_github()));
        *self.review.lock().unwrap() = None;
        self.each_comment(|thread, index| thread.comments[index].pending = false);
        Ok(())
    }
    fn set_viewed(&self, _pr: &PullRequest, path: &str, viewed: bool) -> Result<()> {
        self.note(format!("viewed {path} {viewed}"));
        Ok(())
    }
    fn fetch(&self, _pr: &PullRequest) -> Result<RemoteState> {
        self.note("fetch");
        let mut remote = self.remote.lock().unwrap().clone();
        remote.has_pending_review = self.review.lock().unwrap().is_some();
        if remote.head_sha.is_empty() {
            "head".clone_into(&mut remote.head_sha);
        }
        Ok(remote)
    }
}

#[derive(Clone)]
pub struct FakeCheckout {
    pub head: Arc<Mutex<String>>,
    pub relation: Relation,
    pub clean: bool,
}

impl Checkout for FakeCheckout {
    fn head(&self) -> Option<String> {
        Some(self.head.lock().unwrap().clone())
    }
    fn fetch_pr(&self, _number: u64) -> Result<()> {
        Ok(())
    }
    fn relation(&self, _sha: &str) -> Result<Relation> {
        Ok(self.relation)
    }
    fn is_clean(&self) -> bool {
        self.clean
    }
    fn fast_forward(&self, sha: &str) -> Result<()> {
        sha.clone_into(&mut self.head.lock().unwrap());
        Ok(())
    }
}

#[derive(Clone, Default)]
pub struct FakeEditor(pub Arc<Mutex<Vec<DifitEdit>>>);

impl DifitEditor for FakeEditor {
    fn apply(&self, edits: &[DifitEdit]) -> Result<()> {
        self.0.lock().unwrap().extend_from_slice(edits);
        Ok(())
    }
}
