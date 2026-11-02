//! Merge conflicts left by a reviewer-requested pull.
//!
//! They appear when the pull restores the stashed local changes on top of the
//! PR's new commits. There are two ways out: the reviewer resolves them, or the
//! LLM pane is asked to.

/// Who resolves a pull's merge conflicts, as the browser's modal asks.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ConflictResolution {
    /// Type a prompt into the LLM pane asking it to resolve them.
    Llm,
    /// The reviewer resolves them by hand.
    Reviewer,
}

impl ConflictResolution {
    /// Parse the browser's spelling: `llm` or `reviewer`.
    #[must_use]
    pub fn parse(value: &str) -> Option<Self> {
        match value {
            "llm" => Some(Self::Llm),
            "reviewer" => Some(Self::Reviewer),
            _ => None,
        }
    }
}

fn files_label(num_files: usize) -> String {
    format!("{num_files} file{}", if num_files == 1 { "" } else { "s" })
}

/// The header notice while a pull's conflicts wait for the reviewer's answer.
#[must_use]
pub fn conflicts_notice(num_files: usize) -> String {
    format!(
        "Pulled the PR's new commits, but restoring your local changes conflicted in {}.",
        files_label(num_files)
    )
}

/// The header notice once the reviewer says they will resolve the conflicts.
#[must_use]
pub fn reviewer_resolves_notice(num_files: usize) -> String {
    format!(
        "Resolve the merge conflicts in {}, then run `git stash drop`: git kept your stashed changes because of the conflict.",
        files_label(num_files)
    )
}

/// The header notice once the reviewer hands the conflicts to the LLM.
#[must_use]
pub fn llm_resolves_notice(num_files: usize) -> String {
    format!(
        "Asked the LLM to resolve the merge conflicts in {}.",
        files_label(num_files)
    )
}

/// The prompt typed into the LLM pane to resolve the conflicts in `files`.
///
/// The changes were uncommitted before the pull, so they stay that way: the
/// LLM clears the conflict state with `git reset` (which leaves the work tree
/// alone) and drops the stash entry git kept because of the conflict.
#[must_use]
pub fn resolve_prompt(files: &[String]) -> String {
    let list: Vec<String> = files.iter().map(|file| format!("- {file}")).collect();
    format!(
        "Syncing with GitHub pulled the PR's new commits, and re-applying the stashed \
         local changes on top of them left merge conflicts in:\n{list}\n\n\
         Resolve every conflict, keeping both the PR's changes and the local changes \
         unless they truly contradict. Once no conflict markers remain, run `git reset -q` \
         so the changes are unstaged, as they were before the pull, then `git stash drop` \
         to discard the stash entry git kept because of the conflict. Do not commit.",
        list = list.join("\n"),
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_browser_names_who_resolves() {
        assert_eq!(
            ConflictResolution::parse("llm"),
            Some(ConflictResolution::Llm)
        );
        assert_eq!(
            ConflictResolution::parse("reviewer"),
            Some(ConflictResolution::Reviewer)
        );
        assert_eq!(ConflictResolution::parse("nobody"), None);
    }

    #[test]
    fn the_notice_counts_the_conflicted_files() {
        assert!(
            conflicts_notice(1).contains("1 file."),
            "{}",
            conflicts_notice(1)
        );
        assert!(
            conflicts_notice(2).contains("2 files."),
            "{}",
            conflicts_notice(2)
        );
    }

    #[test]
    fn the_prompt_lists_each_file_and_leaves_the_changes_uncommitted() {
        let prompt = resolve_prompt(&["src/a.rs".to_owned(), "src/b.rs".to_owned()]);
        assert!(prompt.contains("- src/a.rs\n- src/b.rs"), "{prompt}");
        assert!(prompt.contains("git reset -q"), "{prompt}");
        assert!(prompt.contains("git stash drop"), "{prompt}");
        assert!(prompt.contains("Do not commit"), "{prompt}");
    }
}
