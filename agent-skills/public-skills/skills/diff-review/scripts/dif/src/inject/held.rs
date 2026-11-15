//! The comments held for "Send all", kept on disk so quitting `dif` does not
//! lose them.
//!
//! A relaunch seeds every comment difit already holds as the dispatch
//! baseline, which would otherwise fold a held comment in with the ones the
//! LLM has already seen: it would stay visible in the browser but never reach
//! the LLM. The held message ids are saved to `-held.json` whenever the queue
//! changes, and the next launch restores them as still held.

use std::fs;
use std::path::PathBuf;

use crate::difit::transcript;

/// The held message ids for one review and the file they persist to.
pub struct HeldComments {
    path: PathBuf,
    saved: Vec<String>,
}

impl HeldComments {
    /// Read the held ids saved at `path`. A missing or unreadable file means
    /// nothing is held.
    #[must_use]
    pub fn load(path: PathBuf) -> Self {
        let saved = fs::read_to_string(&path)
            .ok()
            .and_then(|text| serde_json::from_str(&text).ok())
            .unwrap_or_default();
        Self { path, saved }
    }

    /// The held message ids as last saved.
    #[must_use]
    pub fn ids(&self) -> &[String] {
        &self.saved
    }

    /// Save `held` when it differs from what was last saved. An empty queue
    /// removes the file.
    pub fn save(&mut self, held: &[String]) {
        if self.saved == held {
            return;
        }
        let written = if held.is_empty() {
            fs::remove_file(&self.path).or_else(|e| match e.kind() {
                std::io::ErrorKind::NotFound => Ok(()),
                _ => Err(e.into()),
            })
        } else {
            serde_json::to_string_pretty(held)
                .map_err(anyhow::Error::from)
                .and_then(|text| transcript::write_text(&self.path, &text))
        };
        if written.is_ok() {
            self.saved = held.to_vec();
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn ids(values: &[&str]) -> Vec<String> {
        values.iter().map(|&value| value.to_owned()).collect()
    }

    #[test]
    fn saved_ids_are_restored_by_the_next_load() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("r-difit-dot-held.json");
        HeldComments::load(path.clone()).save(&ids(&["m1", "m2"]));
        assert_eq!(HeldComments::load(path).ids(), ids(&["m1", "m2"]));
    }

    #[test]
    fn an_empty_queue_removes_the_file() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("r-difit-dot-held.json");
        let mut held = HeldComments::load(path.clone());
        held.save(&ids(&["m1"]));
        held.save(&[]);
        assert!(!path.exists());
        assert!(HeldComments::load(path).ids().is_empty());
    }

    #[test]
    fn an_unreadable_file_holds_nothing() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("r-difit-dot-held.json");
        fs::write(&path, "not json").unwrap();
        assert!(HeldComments::load(path).ids().is_empty());
    }
}
