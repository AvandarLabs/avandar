//! Shell identity served at `/__wrap/meta.json`: the branch under review and
//! the worktree it lives in.
//!
//! The header renders the **branch** as its title. When the checkout's
//! directory does not correspond to the branch (a linked git worktree whose
//! folder is named something else), the shell also shows a small **worktree**
//! pill. All pure string logic here; the values are captured once at startup
//! and handed to the server.

use std::path::{Component, Path};

/// The worktree's name for the header pill.
///
/// If the checkout directory path ends with the branch — the common worktree
/// layout `…/<repo>/<branch>` where `<branch>` may itself contain slashes
/// (`feat/web-shell`) — the worktree *is* the branch, so we return the branch
/// verbatim and [`show_worktree`] hides the (redundant) pill. Otherwise we
/// return the directory basename (e.g. the repo name for a main checkout on a
/// differently-named branch), which the pill then shows.
#[must_use]
pub fn worktree_name(repo_root: &Path, branch: &str) -> String {
    if path_ends_with_branch(repo_root, branch) {
        return branch.to_owned();
    }
    repo_root.file_name().map_or_else(
        || repo_root.to_string_lossy().into_owned(),
        |s| s.to_string_lossy().into_owned(),
    )
}

/// Whether the checkout directory's trailing path components spell out `branch`.
///
/// `branch` is split on `/`; the same number of trailing normal path components
/// must equal those segments. Empty branch → never a match.
#[must_use]
fn path_ends_with_branch(repo_root: &Path, branch: &str) -> bool {
    let segs: Vec<&str> = branch.split('/').filter(|s| !s.is_empty()).collect();
    if segs.is_empty() {
        return false;
    }
    let comps: Vec<String> = repo_root
        .components()
        .filter_map(|c| match c {
            Component::Normal(s) => Some(s.to_string_lossy().into_owned()),
            _ => None,
        })
        .collect();
    if comps.len() < segs.len() {
        return false;
    }
    comps[comps.len() - segs.len()..]
        .iter()
        .zip(&segs)
        .all(|(comp, seg)| comp == seg)
}

/// Whether to show the worktree pill.
///
/// Only when it names something other than the branch (and is non-empty).
/// Reviewing a branch in a checkout that corresponds to that branch shows no
/// redundant pill.
#[must_use]
pub fn show_worktree(branch: &str, worktree: &str) -> bool {
    !worktree.is_empty() && worktree != branch
}

/// Serialize the header identity as the `/__wrap/meta.json` body.
///
/// Shape: `{"branch": "...", "worktree": "...", "showWorktree": bool}`. Uses
/// `serde_json` so branch/worktree names are escaped correctly. (Whether the
/// guide is stale is decided in the browser by comparing the guide's file list
/// against difit's real diff, so it isn't served here.)
#[must_use]
pub fn meta_json(branch: &str, worktree: &str) -> Vec<u8> {
    let value = serde_json::json!({
        "branch": branch,
        "worktree": worktree,
        "showWorktree": show_worktree(branch, worktree),
    });
    serde_json::to_vec(&value).unwrap_or_else(|_| b"{}".to_vec())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    #[test]
    fn worktree_matching_the_branch_path_returns_the_branch() {
        // The canonical worktree layout: `…/<repo>/<branch>` with a slashful
        // branch. The dir path ends with the full branch → no redundant pill.
        let p = PathBuf::from("/Users/x/src/worktrees/avandar/feat/web-shell");
        assert_eq!(worktree_name(&p, "feat/web-shell"), "feat/web-shell");
        assert!(!show_worktree("feat/web-shell", &worktree_name(&p, "feat/web-shell")));
    }

    #[test]
    fn single_segment_branch_matching_its_dir_hides_the_pill() {
        let p = PathBuf::from("/Users/x/src/worktrees/avandar/hotfix");
        assert_eq!(worktree_name(&p, "hotfix"), "hotfix");
        assert!(!show_worktree("hotfix", &worktree_name(&p, "hotfix")));
    }

    #[test]
    fn worktree_falls_back_to_basename_when_it_differs_from_branch() {
        // A main checkout named after the repo, on a differently-named branch.
        let p = PathBuf::from("/Users/x/src/avandar");
        assert_eq!(worktree_name(&p, "develop"), "avandar");
        assert!(show_worktree("develop", &worktree_name(&p, "develop")));
    }

    #[test]
    fn basename_matching_a_slashful_branch_still_shows_a_pill() {
        // Dir is only the branch *leaf*, not the full slashful branch → they
        // genuinely differ, so the pill shows the leaf.
        let p = PathBuf::from("/Users/x/src/worktrees/avandar/web-shell");
        assert_eq!(worktree_name(&p, "feat/web-shell"), "web-shell");
        assert!(show_worktree("feat/web-shell", "web-shell"));
    }

    #[test]
    fn meta_json_carries_branch_worktree_and_flag() {
        let body = meta_json("develop", "avandar");
        let v: serde_json::Value = serde_json::from_slice(&body).unwrap();
        assert_eq!(v["branch"], "develop");
        assert_eq!(v["worktree"], "avandar");
        assert_eq!(v["showWorktree"], true);
    }

    #[test]
    fn meta_json_hides_pill_when_names_match() {
        let body = meta_json("feat/web-shell", "feat/web-shell");
        let v: serde_json::Value = serde_json::from_slice(&body).unwrap();
        assert_eq!(v["showWorktree"], false);
    }

    #[test]
    fn meta_json_escapes_special_characters() {
        let body = meta_json("feat/\"quote\"", "wt\\slash");
        let v: serde_json::Value = serde_json::from_slice(&body).unwrap();
        assert_eq!(v["branch"], "feat/\"quote\"");
        assert_eq!(v["worktree"], "wt\\slash");
    }
}
