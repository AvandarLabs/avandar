//! Keeping the local branch in step with the PR head.
//!
//! When the PR has commits the checkout lacks, a pull fast-forwards the branch,
//! but only when that cannot lose work: the branch must be strictly behind the
//! PR and no tracked file may have uncommitted changes. Anything else leaves
//! the checkout alone and tells the reviewer why.

use std::path::PathBuf;
use std::process::Command;

use anyhow::{Result, bail};

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
    pub notice: Option<String>,
}

/// Decide the branch step for `relation`, given whether the tracked files are
/// clean.
#[must_use]
pub fn branch_step(relation: Relation, clean: bool) -> BranchStep {
    let notice = |text: &str| Some(text.to_owned());
    match (relation, clean) {
        (Relation::Same, _) => BranchStep {
            fast_forward: false,
            notice: None,
        },
        (Relation::Behind, true) => BranchStep {
            fast_forward: true,
            notice: None,
        },
        (Relation::Behind, false) => BranchStep {
            fast_forward: false,
            notice: notice(
                "The PR has new commits. Commit or stash your changes, then sync to pull them.",
            ),
        },
        (Relation::Ahead, _) => BranchStep {
            fast_forward: false,
            notice: notice(
                "Your branch has commits the PR doesn't. Push them so PR comments line up.",
            ),
        },
        (Relation::Diverged, _) => BranchStep {
            fast_forward: false,
            notice: notice("Your branch and the PR have diverged. Rebase or merge to sync them."),
        },
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
}

impl Checkout for GitCheckout {
    fn head(&self) -> Option<String> {
        let output = self.git(&["rev-parse", "HEAD"]).ok()?;
        output
            .status
            .success()
            .then(|| String::from_utf8_lossy(&output.stdout).trim().to_owned())
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
}

#[cfg(test)]
mod tests {
    use std::path::Path;

    use super::*;

    #[test]
    fn only_a_clean_branch_strictly_behind_fast_forwards() {
        assert!(branch_step(Relation::Behind, true).fast_forward);
        for (relation, clean) in [
            (Relation::Behind, false),
            (Relation::Ahead, true),
            (Relation::Diverged, true),
            (Relation::Same, true),
        ] {
            assert!(!branch_step(relation, clean).fast_forward, "{relation:?}");
        }
        assert!(branch_step(Relation::Same, false).notice.is_none());
        assert!(
            branch_step(Relation::Behind, false)
                .notice
                .unwrap()
                .contains("stash")
        );
    }

    fn git(dir: &Path, args: &[&str]) -> String {
        let out = Command::new("git")
            .args(args)
            .current_dir(dir)
            .output()
            .unwrap();
        assert!(
            out.status.success(),
            "git {args:?}: {}",
            String::from_utf8_lossy(&out.stderr)
        );
        String::from_utf8_lossy(&out.stdout).trim().to_owned()
    }

    fn commit(dir: &Path, file: &str, text: &str) -> String {
        std::fs::write(dir.join(file), text).unwrap();
        git(dir, &["add", "-A"]);
        git(dir, &["commit", "-qm", text]);
        git(dir, &["rev-parse", "HEAD"])
    }

    /// An `origin` holding `refs/pull/7/head` one commit ahead of a clone.
    fn origin_ahead_of_clone() -> Option<(tempfile::TempDir, PathBuf, String)> {
        Command::new("git").arg("--version").output().ok()?;
        let dir = tempfile::tempdir().unwrap();
        let origin = dir.path().join("origin");
        std::fs::create_dir(&origin).unwrap();
        git(&origin, &["init", "-q", "-b", "feat"]);
        git(&origin, &["config", "user.email", "t@t.co"]);
        git(&origin, &["config", "user.name", "t"]);
        commit(&origin, "a.txt", "one");
        let clone = dir.path().join("clone");
        git(
            dir.path(),
            &["clone", "-q", origin.to_str().unwrap(), "clone"],
        );
        git(&clone, &["config", "user.email", "t@t.co"]);
        git(&clone, &["config", "user.name", "t"]);
        let ahead = commit(&origin, "a.txt", "two");
        git(&origin, &["update-ref", "refs/pull/7/head", &ahead]);
        Some((dir, clone, ahead))
    }

    #[test]
    fn fetches_and_fast_forwards_a_clean_branch() {
        let Some((_dir, clone, ahead)) = origin_ahead_of_clone() else {
            return;
        };
        let checkout = GitCheckout::new(clone);
        checkout.fetch_pr(7).unwrap();
        assert_eq!(checkout.relation(&ahead).unwrap(), Relation::Behind);
        assert!(checkout.is_clean());
        checkout.fast_forward(&ahead).unwrap();
        assert_eq!(checkout.head().as_deref(), Some(ahead.as_str()));
        assert_eq!(checkout.relation(&ahead).unwrap(), Relation::Same);
    }

    #[test]
    fn tracked_edits_make_the_checkout_dirty_and_new_commits_put_it_ahead() {
        let Some((_dir, clone, ahead)) = origin_ahead_of_clone() else {
            return;
        };
        let checkout = GitCheckout::new(clone.clone());
        std::fs::write(clone.join("a.txt"), "local edit").unwrap();
        assert!(!checkout.is_clean());
        std::fs::write(clone.join("untracked.txt"), "x").unwrap();
        git(&clone, &["checkout", "--", "a.txt"]);
        assert!(
            checkout.is_clean(),
            "untracked files don't block a fast-forward"
        );

        commit(&clone, "b.txt", "local commit");
        checkout.fetch_pr(7).unwrap();
        assert_eq!(checkout.relation(&ahead).unwrap(), Relation::Diverged);
    }
}
