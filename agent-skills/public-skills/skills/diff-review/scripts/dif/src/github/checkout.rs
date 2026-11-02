//! Keeping the local branch in step with the PR head.
//!
//! When the PR has commits the checkout lacks, a pull fast-forwards the branch,
//! but only when that cannot lose work: the branch must be strictly behind the
//! PR. Uncommitted changes to tracked files block the minute-by-minute pull,
//! but a pull the reviewer asks for (the browser's **Sync**) stashes them,
//! fast-forwards, and restores them. Anything else leaves the checkout alone
//! and tells the reviewer why.

use std::path::PathBuf;
use std::process::Command;

use anyhow::{Context, Result, bail};

/// The message on the stash entry a reviewer-requested pull makes.
const STASH_MESSAGE: &str = "dif: local changes stashed to pull the PR's new commits";

/// How the checked-out commit relates to the PR head.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Relation {
    Same,
    /// The PR has commits the checkout lacks.
    Behind,
    /// The checkout has commits the PR lacks.
    Ahead,
    Diverged,
}

/// What a pull does about the branch.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BranchStep {
    pub fast_forward: bool,
    /// Stash the tracked local changes first and restore them after.
    pub stash: bool,
    pub notice: Option<String>,
}

impl BranchStep {
    const fn stay(notice: Option<String>) -> Self {
        Self {
            fast_forward: false,
            stash: false,
            notice,
        }
    }
}

/// Decide the branch step for `relation`.
///
/// `clean` says whether the tracked files are unchanged. `may_stash` says
/// whether the reviewer asked for this pull, the only time local changes may
/// be stashed to let it through.
#[must_use]
pub fn branch_step(relation: Relation, clean: bool, may_stash: bool) -> BranchStep {
    let notice = |text: &str| Some(text.to_owned());
    match (relation, clean) {
        (Relation::Same, _) => BranchStep::stay(None),
        (Relation::Behind, true) => BranchStep {
            fast_forward: true,
            stash: false,
            notice: None,
        },
        (Relation::Behind, false) if may_stash => BranchStep {
            fast_forward: true,
            stash: true,
            notice: None,
        },
        (Relation::Behind, false) => BranchStep::stay(notice(
            "The PR has new commits. Click Sync to pull them: your local changes are stashed and restored.",
        )),
        (Relation::Ahead, _) => BranchStep::stay(notice(
            "Your branch has commits the PR doesn't. Push them so PR comments line up.",
        )),
        (Relation::Diverged, _) => BranchStep::stay(notice(
            "Your branch and the PR have diverged. Rebase or merge to sync them.",
        )),
    }
}

/// How restoring stashed local changes went.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Unstash {
    Applied,
    /// These files conflict. git keeps the stash entry until it is dropped.
    Conflicts(Vec<String>),
}

/// Fast-forward to `sha`, first stashing the tracked local changes when `stash`
/// is set and restoring them after. A failed fast-forward still restores them.
///
/// # Errors
///
/// When stashing, the fast-forward, or the restore fails. Conflicts on restore
/// are not an error: they come back as [`Unstash::Conflicts`].
pub fn fast_forward_keeping_changes(
    checkout: &dyn Checkout,
    sha: &str,
    stash: bool,
) -> Result<Unstash> {
    let stashed = stash
        && checkout
            .stash()
            .context("could not stash your local changes")?;
    let pulled = checkout.fast_forward(sha);
    let restored = if stashed {
        checkout.pop_stash()
    } else {
        Ok(Unstash::Applied)
    };
    match (pulled, restored) {
        (Ok(()), restored) => restored,
        (Err(e), Ok(_)) => Err(e),
        (Err(e), Err(restore)) => {
            Err(e.context(format!("your local changes are still stashed: {restore}")))
        }
    }
}

/// The git operations a pull needs. The seam the sync pass is tested through.
pub trait Checkout: Send {
    /// The checked-out commit.
    fn head(&self) -> Option<String>;
    /// Fetch PR `number`'s head so its commits exist locally.
    fn fetch_pr(&self, number: u64) -> Result<()>;
    /// How the checkout relates to `sha` (which must exist locally).
    fn relation(&self, sha: &str) -> Result<Relation>;
    /// Whether no tracked file has uncommitted changes.
    fn is_clean(&self) -> bool;
    /// Fast-forward the checked-out branch to `sha`.
    fn fast_forward(&self, sha: &str) -> Result<()>;
    /// Stash the tracked local changes. Returns whether a stash entry was made,
    /// so a clean checkout never restores someone else's older entry.
    fn stash(&self) -> Result<bool>;
    /// Restore the newest stash entry, dropping it unless it conflicts.
    fn pop_stash(&self) -> Result<Unstash>;
}

/// [`Checkout`] over the `git` CLI in the repo root.
pub struct GitCheckout {
    repo_root: PathBuf,
}

impl GitCheckout {
    /// Git operations in `repo_root`.
    #[must_use]
    pub const fn new(repo_root: PathBuf) -> Self {
        Self { repo_root }
    }

    fn git(&self, args: &[&str]) -> std::io::Result<std::process::Output> {
        Command::new("git")
            .args(args)
            .current_dir(&self.repo_root)
            .output()
    }

    fn ok(&self, args: &[&str]) -> Result<()> {
        let output = self.git(args)?;
        if !output.status.success() {
            bail!(
                "git {}: {}",
                args.join(" "),
                String::from_utf8_lossy(&output.stderr).trim()
            );
        }
        Ok(())
    }

    fn is_ancestor(&self, ancestor: &str, descendant: &str) -> bool {
        self.git(&["merge-base", "--is-ancestor", ancestor, descendant])
            .is_ok_and(|o| o.status.success())
    }

    fn stdout(&self, args: &[&str]) -> Option<String> {
        let output = self.git(args).ok()?;
        output
            .status
            .success()
            .then(|| String::from_utf8_lossy(&output.stdout).trim().to_owned())
    }

    /// The newest stash entry's commit, if any.
    fn stash_top(&self) -> Option<String> {
        self.stdout(&["rev-parse", "--quiet", "--verify", "refs/stash"])
    }

    /// Files left with unmerged entries, e.g. by a conflicting `stash pop`.
    fn conflicted_files(&self) -> Vec<String> {
        self.stdout(&["diff", "--name-only", "--diff-filter=U"])
            .map(|out| out.lines().map(str::to_owned).collect())
            .unwrap_or_default()
    }
}

impl Checkout for GitCheckout {
    fn head(&self) -> Option<String> {
        self.stdout(&["rev-parse", "HEAD"])
    }

    fn fetch_pr(&self, number: u64) -> Result<()> {
        self.ok(&["fetch", "--quiet", "origin", &format!("pull/{number}/head")])
    }

    fn relation(&self, sha: &str) -> Result<Relation> {
        let Some(head) = self.head() else {
            bail!("could not read HEAD");
        };
        Ok(if head == sha {
            Relation::Same
        } else if self.is_ancestor(&head, sha) {
            Relation::Behind
        } else if self.is_ancestor(sha, &head) {
            Relation::Ahead
        } else {
            Relation::Diverged
        })
    }

    fn is_clean(&self) -> bool {
        self.git(&["status", "--porcelain", "--untracked-files=no"])
            .is_ok_and(|o| o.status.success() && o.stdout.is_empty())
    }

    fn fast_forward(&self, sha: &str) -> Result<()> {
        self.ok(&["merge", "--ff-only", "--quiet", sha])
    }

    fn stash(&self) -> Result<bool> {
        let before = self.stash_top();
        self.ok(&["stash", "push", "--quiet", "--message", STASH_MESSAGE])?;
        Ok(self.stash_top() != before)
    }

    fn pop_stash(&self) -> Result<Unstash> {
        let output = self.git(&["stash", "pop", "--quiet"])?;
        if output.status.success() {
            return Ok(Unstash::Applied);
        }
        let conflicts = self.conflicted_files();
        if conflicts.is_empty() {
            bail!(
                "git stash pop: {}",
                String::from_utf8_lossy(&output.stderr).trim()
            );
        }
        Ok(Unstash::Conflicts(conflicts))
    }
}

#[cfg(test)]
#[path = "checkout_tests.rs"]
mod tests;
