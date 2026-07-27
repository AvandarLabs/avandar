//! The user-facing comparison key and everything derived from it.
//!
//! `dif` accepts the same comparison vocabulary as the old zsh wrapper:
//!   - `.`        → uncommitted worktree changes
//!   - `staged`   → staged changes
//!   - `working`  → working-tree changes
//!   - anything else → a base branch, compared via difit's `@ <branch>`
//!
//! From the key we derive three things the rest of the program needs:
//!   - the positional args handed to `difit`,
//!   - the transcript *scope slug* (must match the filenames the
//!     `diff-review` skill computes, so the slug rules are frozen to
//!     match the historical `difit-stop.py` algorithm), and
//!   - the per-comment commit policy: a branch comparison commits each
//!     addressed comment; the uncommitted/staged/working scopes fold edits
//!     into the existing changes without committing.

/// How `dif` should compare the working tree, parsed from the user's key.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ComparisonKey {
    /// `.` — uncommitted worktree changes.
    Uncommitted,
    /// `staged` — staged changes.
    Staged,
    /// `working` — working-tree changes.
    Working,
    /// Any other key: a base branch, compared via difit's `@ <branch>`.
    Branch(String),
}

/// Whether each addressed comment should be committed on its own.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CommitPolicy {
    /// Branch comparison: edit, commit (naming the comment), then reply.
    CommitPerComment,
    /// Uncommitted/staged/working: edit and reply, fold into existing
    /// changes, never commit.
    FoldIntoChanges,
}

impl ComparisonKey {
    /// Parse a raw key into a [`ComparisonKey`]. Worktree aliases map to their
    /// variants; everything else is treated as a base-branch name.
    #[must_use]
    pub fn parse(key: &str) -> Self {
        match key {
            "." => Self::Uncommitted,
            "staged" => Self::Staged,
            "working" => Self::Working,
            other => Self::Branch(other.to_owned()),
        }
    }

    /// The original user-facing key (`.`, `staged`, `working`, or the branch
    /// name). The inverse of [`ComparisonKey::parse`].
    #[must_use]
    pub fn key(&self) -> String {
        match self {
            Self::Uncommitted => ".".to_owned(),
            Self::Staged => "staged".to_owned(),
            Self::Working => "working".to_owned(),
            Self::Branch(b) => b.clone(),
        }
    }

    /// The positional arguments handed to `difit`.
    ///
    /// Worktree aliases pass through as a single arg; a branch becomes the
    /// two-token `@ <branch>` base comparison.
    #[must_use]
    pub fn difit_args(&self) -> Vec<String> {
        match self {
            Self::Uncommitted => vec![".".to_owned()],
            Self::Staged => vec!["staged".to_owned()],
            Self::Working => vec!["working".to_owned()],
            Self::Branch(b) => vec!["@".to_owned(), b.clone()],
        }
    }

    /// The transcript scope slug, e.g. `dot`, `staged`, `at-develop`.
    ///
    /// Frozen to match the historical `difit-stop.py` algorithm so transcript
    /// filenames line up with what the `diff-review` skill computes:
    /// join the difit args with a space, substitute `@`→`at` and `.`→`dot`,
    /// lowercase, collapse non-alphanumerics to single dashes, trim, and fall
    /// back to `diff` if empty.
    #[must_use]
    pub fn scope_slug(&self) -> String {
        let raw = self.difit_args().join(" ");
        let substituted = raw.to_lowercase().replace('@', "at").replace('.', "dot");
        let slug = crate::slug::slugify(&substituted);
        if slug.is_empty() {
            "diff".to_owned()
        } else {
            slug
        }
    }

    /// The per-comment commit policy for this comparison.
    #[must_use]
    pub const fn commit_policy(&self) -> CommitPolicy {
        match self {
            Self::Branch(_) => CommitPolicy::CommitPerComment,
            Self::Uncommitted | Self::Staged | Self::Working => CommitPolicy::FoldIntoChanges,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_maps_worktree_aliases() {
        assert_eq!(ComparisonKey::parse("."), ComparisonKey::Uncommitted);
        assert_eq!(ComparisonKey::parse("staged"), ComparisonKey::Staged);
        assert_eq!(ComparisonKey::parse("working"), ComparisonKey::Working);
    }

    #[test]
    fn parse_treats_anything_else_as_a_branch() {
        assert_eq!(
            ComparisonKey::parse("develop"),
            ComparisonKey::Branch("develop".to_owned())
        );
        assert_eq!(
            ComparisonKey::parse("feat/x"),
            ComparisonKey::Branch("feat/x".to_owned())
        );
    }

    #[test]
    fn difit_args_for_branch_use_at_form() {
        assert_eq!(
            ComparisonKey::parse("main").difit_args(),
            vec!["@".to_owned(), "main".to_owned()]
        );
    }

    #[test]
    fn difit_args_for_aliases_pass_through() {
        assert_eq!(
            ComparisonKey::Uncommitted.difit_args(),
            vec![".".to_owned()]
        );
        assert_eq!(
            ComparisonKey::Staged.difit_args(),
            vec!["staged".to_owned()]
        );
    }

    #[test]
    fn scope_slug_matches_skill_examples() {
        assert_eq!(ComparisonKey::Uncommitted.scope_slug(), "dot");
        assert_eq!(ComparisonKey::Staged.scope_slug(), "staged");
        assert_eq!(ComparisonKey::Working.scope_slug(), "working");
        assert_eq!(ComparisonKey::parse("develop").scope_slug(), "at-develop");
        assert_eq!(ComparisonKey::parse("main").scope_slug(), "at-main");
    }

    #[test]
    fn scope_slug_collapses_branch_punctuation() {
        assert_eq!(
            ComparisonKey::parse("feat/share").scope_slug(),
            "at-feat-share"
        );
    }

    #[test]
    fn key_round_trips_through_parse() {
        for raw in [".", "staged", "working", "develop", "feat/x"] {
            assert_eq!(ComparisonKey::parse(raw).key(), raw);
        }
    }

    #[test]
    fn commit_policy_follows_comparison() {
        assert_eq!(
            ComparisonKey::parse("develop").commit_policy(),
            CommitPolicy::CommitPerComment
        );
        assert_eq!(
            ComparisonKey::Uncommitted.commit_policy(),
            CommitPolicy::FoldIntoChanges
        );
        assert_eq!(
            ComparisonKey::Staged.commit_policy(),
            CommitPolicy::FoldIntoChanges
        );
    }
}
