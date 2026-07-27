//! The structured diff guide (`…-guide.json`): the sidebar's data + the
//! per-group file sets the `/api/diff` filter needs.
//!
//! The `diff-review` skill writes this file whenever it writes `…-guide.md`.
//! We read it fresh on demand (it changes across review rounds) rather than
//! caching. Everything here **fails soft**: a missing or malformed file yields
//! an empty roster, so the shell still serves the Full view and simply offers
//! no group filtering.

use std::collections::HashSet;
use std::path::Path;

use serde::Deserialize;

/// One file row within a group (mirrors the skill's `-guide.json` shape).
#[derive(Debug, Clone, Deserialize)]
pub struct GuideFile {
    /// Repo-relative path, matched against difit's `/api/diff` `files[].path`.
    pub path: String,
    /// Short reviewer-facing note (sidebar).
    #[serde(default)]
    pub tag: String,
    /// Number of `claude` threads on this file.
    #[serde(default)]
    pub threads: u32,
    /// `"—"` | `"reviewed"` | `"changed"`.
    #[serde(default)]
    pub status: String,
}

/// One group of the diff guide.
#[derive(Debug, Clone, Deserialize)]
pub struct Group {
    /// Stable group number.
    pub n: u32,
    /// Free-form kind label (`"bug"`, `"enhancement"`, …).
    #[serde(default)]
    pub kind: String,
    /// Optional issue key (`"PP-39"`).
    #[serde(default)]
    pub ticket: Option<String>,
    /// Group name.
    #[serde(default)]
    pub name: String,
    /// One-line orientation.
    #[serde(default)]
    pub orient: String,
    /// The files in this group.
    #[serde(default)]
    pub files: Vec<GuideFile>,
}

/// The parsed roster of guide groups.
#[derive(Debug, Clone, Default)]
pub struct Groups {
    pub groups: Vec<Group>,
}

impl Groups {
    /// Parse from raw `-guide.json` bytes. Malformed input → empty roster.
    #[must_use]
    pub fn from_json(bytes: &[u8]) -> Self {
        let groups = serde_json::from_slice(bytes).unwrap_or_default();
        Self { groups }
    }

    /// Read + parse the roster from a file. Missing/unreadable/malformed → empty.
    #[must_use]
    pub fn load(path: &Path) -> Self {
        std::fs::read(path).map_or_else(|_| Self::default(), |bytes| Self::from_json(&bytes))
    }

    /// The set of file paths belonging to group `n` (empty if `n` is unknown).
    #[must_use]
    pub fn allowed(&self, n: u32) -> HashSet<String> {
        self.groups
            .iter()
            .filter(|g| g.n == n)
            .flat_map(|g| g.files.iter().map(|f| f.path.clone()))
            .collect()
    }

    /// Every file path the guide covers, across all groups — the set used to
    /// compute the "new files not in guide" complement.
    #[must_use]
    pub fn all_files(&self) -> HashSet<String> {
        self.groups
            .iter()
            .flat_map(|g| g.files.iter().map(|f| f.path.clone()))
            .collect()
    }
}

/// Raw bytes of the guide-json file for serving at `/__wrap/groups.json`.
/// Missing/unreadable → `b"[]"` (a valid empty roster for the sidebar).
#[must_use]
pub fn read_raw(path: &Path) -> Vec<u8> {
    std::fs::read(path).unwrap_or_else(|_| b"[]".to_vec())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    const SAMPLE: &str = r#"[
      { "n": 1, "kind": "bug", "ticket": "PP-39", "name": "ordering", "orient": "x",
        "files": [ { "path": "src/a.ts", "tag": "t", "threads": 1, "status": "—" },
                   { "path": "src/b.ts", "threads": 0 } ] },
      { "n": 3, "kind": "enhancement", "name": "pill",
        "files": [ { "path": "src/c.ts" } ] }
    ]"#;

    #[test]
    fn parses_groups_and_files() {
        let g = Groups::from_json(SAMPLE.as_bytes());
        assert_eq!(g.groups.len(), 2);
        assert_eq!(g.groups[0].n, 1);
        assert_eq!(g.groups[0].ticket.as_deref(), Some("PP-39"));
        assert_eq!(g.groups[1].n, 3);
        assert_eq!(g.groups[1].ticket, None);
    }

    #[test]
    fn allowed_returns_the_group_file_set() {
        let g = Groups::from_json(SAMPLE.as_bytes());
        assert_eq!(
            g.allowed(1),
            HashSet::from(["src/a.ts".to_owned(), "src/b.ts".to_owned()])
        );
        assert_eq!(g.allowed(3), HashSet::from(["src/c.ts".to_owned()]));
    }

    #[test]
    fn allowed_unknown_group_is_empty() {
        assert!(Groups::from_json(SAMPLE.as_bytes()).allowed(99).is_empty());
    }

    #[test]
    fn all_files_unions_every_group() {
        let g = Groups::from_json(SAMPLE.as_bytes());
        assert_eq!(
            g.all_files(),
            HashSet::from([
                "src/a.ts".to_owned(),
                "src/b.ts".to_owned(),
                "src/c.ts".to_owned()
            ])
        );
    }

    #[test]
    fn malformed_json_is_empty_roster() {
        assert!(Groups::from_json(b"not json at all").groups.is_empty());
        assert!(Groups::from_json(b"{}").groups.is_empty());
    }

    #[test]
    fn load_missing_file_is_empty() {
        assert!(
            Groups::load(Path::new("/no/such/guide.json"))
                .groups
                .is_empty()
        );
    }

    #[test]
    fn load_reads_a_real_file() {
        let mut f = tempfile::NamedTempFile::new().unwrap();
        f.write_all(SAMPLE.as_bytes()).unwrap();
        let g = Groups::load(f.path());
        assert_eq!(g.groups.len(), 2);
    }

    #[test]
    fn read_raw_missing_is_empty_array() {
        assert_eq!(read_raw(Path::new("/no/such/guide.json")), b"[]");
    }

    #[test]
    fn read_raw_returns_file_bytes() {
        let mut f = tempfile::NamedTempFile::new().unwrap();
        f.write_all(SAMPLE.as_bytes()).unwrap();
        assert_eq!(read_raw(f.path()), SAMPLE.as_bytes());
    }
}
