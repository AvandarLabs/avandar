//! Reading and atomically writing the `.difit/<…>.json` transcript.
//!
//! The transcript is the canonical, re-injectable conversation. The poller
//! mirrors difit's live state into it; `dif` reads it on launch to seed
//! difit's `--comment`. Writes are atomic (temp file + rename) so a concurrent
//! reader never sees half-written JSON.

use std::fs;
use std::path::Path;

use anyhow::{Context, Result};

use super::imports::ImportEntry;

/// Read the raw transcript text for re-injection via difit `--comment`.
///
/// Returns `None` when the file is absent or contains only whitespace or an
/// empty array, so the caller can launch difit without a `--comment` arg.
#[must_use]
pub fn read_raw(path: &Path) -> Option<String> {
    let text = fs::read_to_string(path).ok()?;
    let trimmed = text.trim();
    if trimmed.is_empty() || trimmed == "[]" {
        return None;
    }
    Some(text)
}

/// Atomically write `entries` to `path` as pretty JSON (temp file + rename in
/// the same directory so the replace is atomic on POSIX).
pub fn write(path: &Path, entries: &[ImportEntry]) -> Result<()> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).with_context(|| format!("creating {}", parent.display()))?;
    }
    let mut serialized = serde_json::to_string_pretty(entries).context("serializing transcript")?;
    serialized.push('\n');

    let tmp = tmp_sibling(path);
    fs::write(&tmp, serialized.as_bytes()).with_context(|| format!("writing {}", tmp.display()))?;
    fs::rename(&tmp, path).with_context(|| format!("renaming into {}", path.display()))?;
    Ok(())
}

/// A hidden sibling temp path in the same directory as `path`.
fn tmp_sibling(path: &Path) -> std::path::PathBuf {
    let name = path
        .file_name()
        .map_or_else(|| ".transcript".to_owned(), |n| n.to_string_lossy().into_owned());
    let pid = std::process::id();
    path.with_file_name(format!(".{name}.{pid}.tmp"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::difit::imports::snapshot_to_imports;

    fn sample_entries() -> Vec<ImportEntry> {
        let snap: crate::difit::imports::Snapshot = serde_json::from_str(
            r#"{"version":1,"threads":[{"id":"t1","filePath":"a.rs",
                "position":{"side":"new","line":1},
                "messages":[{"id":"m1","body":"hi","author":"reviewer"}]}]}"#,
        )
        .unwrap();
        snapshot_to_imports(&snap)
    }

    #[test]
    fn read_raw_is_none_for_missing_or_empty() {
        let dir = tempfile::tempdir().unwrap();
        let missing = dir.path().join("none.json");
        assert!(read_raw(&missing).is_none());

        let empty = dir.path().join("empty.json");
        fs::write(&empty, "  []\n").unwrap();
        assert!(read_raw(&empty).is_none());
    }

    #[test]
    fn write_then_read_round_trips() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("nested").join("t.json");
        write(&path, &sample_entries()).unwrap();

        let raw = read_raw(&path).expect("non-empty transcript");
        assert!(raw.contains("\"m1\""));
        // Re-parseable as import entries.
        let parsed: serde_json::Value = serde_json::from_str(&raw).unwrap();
        assert_eq!(parsed.as_array().unwrap().len(), 1);
    }

    #[test]
    fn write_leaves_no_tmp_files() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("t.json");
        write(&path, &sample_entries()).unwrap();
        let leftovers: Vec<_> = fs::read_dir(dir.path())
            .unwrap()
            .flatten()
            .filter(|e| e.file_name().to_string_lossy().contains(".tmp"))
            .collect();
        assert!(leftovers.is_empty(), "tmp file left behind: {leftovers:?}");
    }
}
