//! Git probes and the default comparison-key resolution.
//!
//! The default `dif` (no argument) compares against `develop` if it exists,
//! else `main`. That decision needs to ask git whether a branch exists, so it
//! goes behind a tiny [`BranchProbe`] trait that tests can fake without a real
//! repository.

use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};
use std::path::{Path, PathBuf};
use std::process::Command;

use anyhow::{Context, Result, bail};

use crate::comparison::ComparisonKey;

/// Something that can answer "does this branch exist?". Implemented for real
/// by [`Git`]; faked in tests.
pub trait BranchProbe {
    /// Whether a local branch named `name` exists.
    fn branch_exists(&self, name: &str) -> bool;
}

/// The real git-backed probe.
pub struct Git;

impl BranchProbe for Git {
    fn branch_exists(&self, name: &str) -> bool {
        Command::new("git")
            .args(["rev-parse", "--verify", "--quiet", name])
            .output()
            .is_ok_and(|o| o.status.success())
    }
}

/// Resolve the comparison key: an explicit argument is parsed directly; with
/// no argument we default to the `develop` branch if it exists, else `main`.
#[must_use]
pub fn resolve_comparison_key(arg: Option<&str>, probe: &impl BranchProbe) -> ComparisonKey {
    arg.map_or_else(
        || {
            let default = if probe.branch_exists("develop") {
                "develop"
            } else {
                "main"
            };
            ComparisonKey::Branch(default.to_owned())
        },
        ComparisonKey::parse,
    )
}

/// The enclosing git repo root (`git rev-parse --show-toplevel`).
pub fn repo_root() -> Result<PathBuf> {
    let out = Command::new("git")
        .args(["rev-parse", "--show-toplevel"])
        .output()
        .context("running git rev-parse --show-toplevel")?;
    if !out.status.success() {
        bail!("not inside a git repository");
    }
    let path = String::from_utf8(out.stdout)
        .context("git printed non-utf8 path")?
        .trim()
        .to_owned();
    Ok(PathBuf::from(path))
}

/// The current branch name, or a `detached-<short-sha>` placeholder when the
/// head is detached.
pub fn current_branch() -> Result<String> {
    let out = Command::new("git")
        .args(["branch", "--show-current"])
        .output()
        .context("running git branch --show-current")?;
    let name = String::from_utf8(out.stdout)
        .context("git printed non-utf8 branch")?
        .trim()
        .to_owned();
    if !name.is_empty() {
        return Ok(name);
    }
    let sha = Command::new("git")
        .args(["rev-parse", "--short", "HEAD"])
        .output()
        .context("running git rev-parse --short HEAD")?;
    let sha = String::from_utf8(sha.stdout)
        .unwrap_or_default()
        .trim()
        .to_owned();
    Ok(format!("detached-{sha}"))
}

/// A signature of the repo's diff state, used to notice when claude (or anyone)
/// changes the code `difit` is showing so `dif` can warn that a restart is
/// needed.
///
/// Hashes `HEAD`, `git status --porcelain`, and `git diff HEAD` together, which
/// moves when a commit lands, a file is staged/unstaged/edited, or an untracked
/// file appears or vanishes — i.e. whenever the diff `difit` rendered at launch
/// goes stale. Comparison-agnostic on purpose: it catches changes for every
/// comparison mode. Returns `None` only if git can't be run at all; an empty
/// repo still yields a stable, comparable signature.
#[must_use]
pub fn diff_signature(repo_root: &Path) -> Option<String> {
    let head = git_capture(repo_root, &["rev-parse", "HEAD"]);
    let status = git_capture(repo_root, &["status", "--porcelain"]);
    let diff = git_capture(repo_root, &["diff", "HEAD"]);
    if head.is_none() && status.is_none() && diff.is_none() {
        return None;
    }
    let mut hasher = DefaultHasher::new();
    head.unwrap_or_default().hash(&mut hasher);
    status.unwrap_or_default().hash(&mut hasher);
    diff.unwrap_or_default().hash(&mut hasher);
    Some(format!("{:016x}", hasher.finish()))
}

/// Run `git <args>` in `repo_root`, returning its stdout on success.
fn git_capture(repo_root: &Path, args: &[&str]) -> Option<String> {
    let out = Command::new("git")
        .current_dir(repo_root)
        .args(args)
        .output()
        .ok()?;
    out.status
        .success()
        .then(|| String::from_utf8_lossy(&out.stdout).into_owned())
}

#[cfg(test)]
mod tests {
    use super::*;

    /// A probe that says yes only to a fixed set of branch names.
    struct FakeProbe(Vec<&'static str>);
    impl BranchProbe for FakeProbe {
        fn branch_exists(&self, name: &str) -> bool {
            self.0.contains(&name)
        }
    }

    #[test]
    fn explicit_arg_is_parsed_directly() {
        let probe = FakeProbe(vec!["develop"]);
        assert_eq!(
            resolve_comparison_key(Some("."), &probe),
            ComparisonKey::Uncommitted
        );
        assert_eq!(
            resolve_comparison_key(Some("staging"), &probe),
            ComparisonKey::Branch("staging".to_owned())
        );
    }

    #[test]
    fn default_prefers_develop_when_present() {
        let probe = FakeProbe(vec!["develop", "main"]);
        assert_eq!(
            resolve_comparison_key(None, &probe),
            ComparisonKey::Branch("develop".to_owned())
        );
    }

    #[test]
    fn default_falls_back_to_main() {
        let probe = FakeProbe(vec!["main"]);
        assert_eq!(
            resolve_comparison_key(None, &probe),
            ComparisonKey::Branch("main".to_owned())
        );
    }

    fn git(repo: &Path, args: &[&str]) {
        let ok = Command::new("git")
            .current_dir(repo)
            .args(args)
            .output()
            .is_ok_and(|o| o.status.success());
        assert!(ok, "git {args:?} failed");
    }

    #[test]
    fn diff_signature_moves_when_the_working_tree_changes() {
        if Command::new("git").arg("--version").output().is_err() {
            eprintln!("SKIP: git not available");
            return;
        }
        let tmp = std::env::temp_dir().join(format!("dif-sig-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&tmp);
        std::fs::create_dir_all(&tmp).unwrap();

        git(&tmp, &["init", "-q"]);
        git(&tmp, &["config", "user.email", "t@t.test"]);
        git(&tmp, &["config", "user.name", "Test"]);
        std::fs::write(tmp.join("f.txt"), "one\n").unwrap();
        git(&tmp, &["add", "."]);
        git(&tmp, &["commit", "-q", "-m", "init"]);

        let base = diff_signature(&tmp).expect("signature");
        assert_eq!(
            base,
            diff_signature(&tmp).unwrap(),
            "stable when nothing changes"
        );

        // An uncommitted edit must move the signature.
        std::fs::write(tmp.join("f.txt"), "one\ntwo\n").unwrap();
        let changed = diff_signature(&tmp).expect("signature");
        assert_ne!(base, changed, "edit must change the signature");

        // A brand-new untracked file must also move it.
        std::fs::write(tmp.join("g.txt"), "new\n").unwrap();
        assert_ne!(
            changed,
            diff_signature(&tmp).unwrap(),
            "untracked file must change it"
        );

        let _ = std::fs::remove_dir_all(&tmp);
    }
}
