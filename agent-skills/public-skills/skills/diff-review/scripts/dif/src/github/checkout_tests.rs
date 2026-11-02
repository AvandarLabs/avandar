//! Tests for [`super`] (the checkout): the branch-step decision, and the git
//! operations against a real `origin` / clone pair.

use std::path::Path;

use super::*;

#[test]
fn only_a_clean_branch_strictly_behind_fast_forwards() {
    assert!(branch_step(Relation::Behind, true, false).fast_forward);
    for (relation, clean) in [
        (Relation::Behind, false),
        (Relation::Ahead, true),
        (Relation::Diverged, true),
        (Relation::Same, true),
    ] {
        assert!(
            !branch_step(relation, clean, false).fast_forward,
            "{relation:?}"
        );
    }
    assert!(branch_step(Relation::Same, false, false).notice.is_none());
    assert!(
        branch_step(Relation::Behind, false, false)
            .notice
            .unwrap()
            .contains("stash")
    );
}

#[test]
fn a_reviewer_sync_stashes_a_dirty_branch_that_is_behind() {
    let step = branch_step(Relation::Behind, false, true);
    assert!(step.fast_forward && step.stash);
    assert!(step.notice.is_none());
    assert!(
        !branch_step(Relation::Behind, true, true).stash,
        "nothing to stash"
    );
    for relation in [Relation::Ahead, Relation::Diverged] {
        assert!(
            !branch_step(relation, false, true).fast_forward,
            "{relation:?}"
        );
    }
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
    std::fs::write(origin.join("b.txt"), "base").unwrap();
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

#[test]
fn stashed_changes_come_back_after_the_fast_forward() {
    let Some((_dir, clone, ahead)) = origin_ahead_of_clone() else {
        return;
    };
    let checkout = GitCheckout::new(clone.clone());
    std::fs::write(clone.join("b.txt"), "local edit").unwrap();
    checkout.fetch_pr(7).unwrap();
    assert_eq!(
        fast_forward_keeping_changes(&checkout, &ahead, true).unwrap(),
        Unstash::Applied
    );
    assert_eq!(checkout.head().as_deref(), Some(ahead.as_str()));
    assert_eq!(
        std::fs::read_to_string(clone.join("b.txt")).unwrap(),
        "local edit"
    );
    assert_eq!(git(&clone, &["stash", "list"]), "");
}

#[test]
fn a_conflicting_restore_names_the_files_and_keeps_the_stash() {
    let Some((_dir, clone, ahead)) = origin_ahead_of_clone() else {
        return;
    };
    let checkout = GitCheckout::new(clone.clone());
    std::fs::write(clone.join("a.txt"), "local edit").unwrap();
    checkout.fetch_pr(7).unwrap();
    assert_eq!(
        fast_forward_keeping_changes(&checkout, &ahead, true).unwrap(),
        Unstash::Conflicts(vec!["a.txt".to_owned()])
    );
    assert_eq!(checkout.head().as_deref(), Some(ahead.as_str()));
    assert_ne!(git(&clone, &["stash", "list"]), "", "git keeps the stash");
}

#[test]
fn a_failed_fast_forward_still_restores_the_local_changes() {
    let Some((_dir, clone, _ahead)) = origin_ahead_of_clone() else {
        return;
    };
    let checkout = GitCheckout::new(clone.clone());
    std::fs::write(clone.join("b.txt"), "local edit").unwrap();
    let missing = "0".repeat(40);
    assert!(fast_forward_keeping_changes(&checkout, &missing, true).is_err());
    assert_eq!(
        std::fs::read_to_string(clone.join("b.txt")).unwrap(),
        "local edit"
    );
    assert_eq!(git(&clone, &["stash", "list"]), "");
}

#[test]
fn a_clean_checkout_leaves_older_stash_entries_alone() {
    let Some((_dir, clone, ahead)) = origin_ahead_of_clone() else {
        return;
    };
    let checkout = GitCheckout::new(clone.clone());
    std::fs::write(clone.join("b.txt"), "older work").unwrap();
    git(&clone, &["stash", "push", "--quiet"]);
    assert!(!checkout.stash().unwrap(), "nothing to stash");
    checkout.fetch_pr(7).unwrap();
    assert_eq!(
        fast_forward_keeping_changes(&checkout, &ahead, true).unwrap(),
        Unstash::Applied
    );
    assert_eq!(
        std::fs::read_to_string(clone.join("b.txt")).unwrap(),
        "base"
    );
    assert_eq!(git(&clone, &["stash", "list"]).lines().count(), 1);
}
