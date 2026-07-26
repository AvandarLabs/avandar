//! Filesystem paths for one review, derived from the repo root + slugs.
//!
//! All paths live under `<repo>/.difit/`. The transcript filename must match
//! what the `diff-review` skill computes (`<branch>-difit-<scope>.json`),
//! so the slug inputs come from [`crate::slug`] / [`crate::comparison`].

use std::path::{Path, PathBuf};

use crate::session::AgentKind;

/// The `.difit` directory inside a repo.
#[must_use]
pub fn difit_dir(repo_root: &Path) -> PathBuf {
    repo_root.join(".difit")
}

/// The canonical transcript path: `<repo>/.difit/<branch>-difit-<scope>.json`.
#[must_use]
pub fn transcript_path(repo_root: &Path, branch_slug: &str, scope_slug: &str) -> PathBuf {
    difit_dir(repo_root).join(format!("{branch_slug}-difit-{scope_slug}.json"))
}

/// The diff-guide markdown for this review:
/// `<repo>/.difit/<branch>-difit-<scope>-guide.md`.
///
/// The `diff-review` skill writes this; the `dif` "Diff guide" view reads
/// and renders it. The filename mirrors the transcript's
/// `<branch>-difit-<scope>` stem so a review's files sort together.
#[must_use]
pub fn guide_path(repo_root: &Path, branch_slug: &str, scope_slug: &str) -> PathBuf {
    difit_dir(repo_root).join(format!("{branch_slug}-difit-{scope_slug}-guide.md"))
}

/// The structured diff-guide for this review:
/// `<repo>/.difit/<branch>-difit-<scope>-guide.json`.
///
/// The `diff-review` skill writes this alongside `-guide.md` (same data, JSON
/// form). The browser web shell reads it to render its sidebar and to derive
/// each group's file set for per-group `/api/diff` filtering.
#[must_use]
pub fn guide_json_path(repo_root: &Path, branch_slug: &str, scope_slug: &str) -> PathBuf {
    difit_dir(repo_root).join(format!("{branch_slug}-difit-{scope_slug}-guide.json"))
}

/// The reviewed-state file for this review:
/// `<repo>/.difit/<branch>-difit-<scope>-reviewed.json`.
///
/// Tracks which guide groups and files the reviewer has signed off on. The
/// skill owns its read/write; `dif` never touches it. Keeping it beside the
/// guide lets "what have I reviewed?" be answered without re-deriving anything.
#[must_use]
pub fn reviewed_state_path(repo_root: &Path, branch_slug: &str, scope_slug: &str) -> PathBuf {
    difit_dir(repo_root).join(format!("{branch_slug}-difit-{scope_slug}-reviewed.json"))
}

/// Where `dif` remembers the Claude session id for this review so a relaunch
/// can `--resume` the same conversation:
/// `<repo>/.difit/.claude-session-<branch>-<scope>`.
#[must_use]
pub fn session_id_path(repo_root: &Path, branch_slug: &str, scope_slug: &str) -> PathBuf {
    llm_session_id_path(repo_root, AgentKind::Claude, branch_slug, scope_slug)
}

/// Where `dif` remembers the selected LLM session id for this review.
#[must_use]
pub fn llm_session_id_path(
    repo_root: &Path,
    agent_kind: AgentKind,
    branch_slug: &str,
    scope_slug: &str,
) -> PathBuf {
    let prefix = match agent_kind {
        AgentKind::Claude => "claude",
        AgentKind::Codex => "codex",
    };
    difit_dir(repo_root).join(format!(".{prefix}-session-{branch_slug}-{scope_slug}"))
}

/// Where `dif` records the live-session metadata.
///
/// Holds the difit port + transcript path so the `diff-review` skill can
/// find the running server when addressing comments outside an injected
/// prompt: `<repo>/.difit/.session-<branch>-<scope>.json`.
#[must_use]
pub fn session_meta_path(repo_root: &Path, branch_slug: &str, scope_slug: &str) -> PathBuf {
    difit_dir(repo_root).join(format!(".session-{branch_slug}-{scope_slug}.json"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn guide_matches_skill_filename() {
        let p = guide_path(Path::new("/r"), "feat-share", "dot");
        assert_eq!(p, PathBuf::from("/r/.difit/feat-share-difit-dot-guide.md"));
    }

    #[test]
    fn guide_json_matches_skill_filename() {
        let p = guide_json_path(Path::new("/r"), "feat-share", "dot");
        assert_eq!(
            p,
            PathBuf::from("/r/.difit/feat-share-difit-dot-guide.json")
        );
    }

    #[test]
    fn reviewed_state_is_scoped_json() {
        let p = reviewed_state_path(Path::new("/r"), "feat-share", "at-develop");
        assert_eq!(
            p,
            PathBuf::from("/r/.difit/feat-share-difit-at-develop-reviewed.json")
        );
    }

    #[test]
    fn transcript_matches_skill_filename() {
        let p = transcript_path(Path::new("/r"), "feat-share", "dot");
        assert_eq!(p, PathBuf::from("/r/.difit/feat-share-difit-dot.json"));
    }

    #[test]
    fn transcript_for_branch_scope() {
        let p = transcript_path(Path::new("/r"), "feat-share", "at-develop");
        assert_eq!(
            p,
            PathBuf::from("/r/.difit/feat-share-difit-at-develop.json")
        );
    }

    #[test]
    fn session_id_file_is_hidden_and_scoped() {
        let p = session_id_path(Path::new("/r"), "feat-share", "dot");
        assert_eq!(p, PathBuf::from("/r/.difit/.claude-session-feat-share-dot"));
    }

    #[test]
    fn codex_session_id_file_is_hidden_and_scoped() {
        let p = llm_session_id_path(Path::new("/r"), AgentKind::Codex, "feat-share", "dot");
        assert_eq!(p, PathBuf::from("/r/.difit/.codex-session-feat-share-dot"));
    }

    #[test]
    fn session_meta_file_is_hidden_json() {
        let p = session_meta_path(Path::new("/r"), "feat-share", "dot");
        assert_eq!(p, PathBuf::from("/r/.difit/.session-feat-share-dot.json"));
    }
}
