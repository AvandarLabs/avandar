//! Pure `/api/diff` filter: narrow difit's diff JSON to one group's files.
//!
//! difit's `/api/diff` returns an object that spreads the parsed diff (a
//! `files` array plus `commit`, `baseCommitish`, `targetCommitish`, `isEmpty`,
//! …) together with request-echo fields. For a group view we keep **every**
//! other field untouched (so difit's per-diff identity — which keys its
//! `localStorage` "viewed" index — is unchanged) and replace `files` with only
//! the entries belonging to the group.
//!
//! **Fail-open:** if the body isn't the shape we expect (not a JSON object, or
//! no `files` array), return it byte-for-byte unchanged. A difit response shape
//! we don't recognize degrades to "no grouping", never to a broken view.

use std::collections::HashSet;
use std::hash::BuildHasher;

/// Narrow difit's `/api/diff` `body` to one group's files.
///
/// Keeps only the `files` entries whose new `path` (or, for renames, `oldPath`)
/// is in `allowed`; every non-`files` field is preserved. Fail-open on
/// unexpected shapes.
#[must_use]
pub fn filter_diff<S: BuildHasher>(body: &[u8], allowed: &HashSet<String, S>) -> Vec<u8> {
    let Ok(mut value) = serde_json::from_slice::<serde_json::Value>(body) else {
        return body.to_vec(); // not JSON → pass through
    };
    let Some(files) = value
        .as_object_mut()
        .and_then(|obj| obj.get_mut("files"))
        .and_then(serde_json::Value::as_array_mut)
    else {
        return body.to_vec(); // not an object, or no `files` array → pass through
    };
    files.retain(|file| {
        let matches = |key| {
            file.get(key)
                .and_then(serde_json::Value::as_str)
                .is_some_and(|path| allowed.contains(path))
        };
        matches("path") || matches("oldPath")
    });
    serde_json::to_vec(&value).unwrap_or_else(|_| body.to_vec())
}

/// Narrow difit's `/api/diff` `body` to files **not** covered by the guide.
///
/// The complement of [`filter_diff`]: keeps only the `files` entries whose new
/// `path` **and** old `oldPath` are both outside `guide_files` — i.e. files in
/// the real diff that no guide group lists (the "new files not in guide" view).
/// Same fail-open contract.
#[must_use]
pub fn filter_ungrouped<S: BuildHasher>(body: &[u8], guide_files: &HashSet<String, S>) -> Vec<u8> {
    let Ok(mut value) = serde_json::from_slice::<serde_json::Value>(body) else {
        return body.to_vec();
    };
    let Some(files) = value
        .as_object_mut()
        .and_then(|obj| obj.get_mut("files"))
        .and_then(serde_json::Value::as_array_mut)
    else {
        return body.to_vec();
    };
    files.retain(|file| {
        let in_guide = |key| {
            file.get(key)
                .and_then(serde_json::Value::as_str)
                .is_some_and(|path| guide_files.contains(path))
        };
        !(in_guide("path") || in_guide("oldPath"))
    });
    serde_json::to_vec(&value).unwrap_or_else(|_| body.to_vec())
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::{Value, json};

    fn set(paths: &[&str]) -> HashSet<String> {
        paths.iter().map(|s| (*s).to_owned()).collect()
    }

    fn sample() -> Value {
        json!({
            "commit": "abc123",
            "baseCommitish": "main",
            "targetCommitish": "HEAD",
            "isEmpty": false,
            "repositoryId": "repo-1",
            "files": [
                { "path": "src/a.ts", "status": "modified" },
                { "path": "src/b.ts", "status": "added" },
                { "path": "src/c.ts", "status": "modified" }
            ]
        })
    }

    fn parse(bytes: &[u8]) -> Value {
        serde_json::from_slice(bytes).expect("valid json out")
    }

    #[test]
    fn keeps_only_allowed_files_in_order() {
        let out = parse(&filter_diff(
            sample().to_string().as_bytes(),
            &set(&["src/a.ts", "src/c.ts"]),
        ));
        let paths: Vec<&str> = out["files"]
            .as_array()
            .unwrap()
            .iter()
            .map(|f| f["path"].as_str().unwrap())
            .collect();
        assert_eq!(paths, vec!["src/a.ts", "src/c.ts"]);
    }

    #[test]
    fn preserves_every_non_files_field_by_value() {
        let input = sample();
        let out = parse(&filter_diff(
            input.to_string().as_bytes(),
            &set(&["src/a.ts"]),
        ));
        for key in [
            "commit",
            "baseCommitish",
            "targetCommitish",
            "isEmpty",
            "repositoryId",
        ] {
            assert_eq!(
                out[key], input[key],
                "field {key} must be preserved unchanged"
            );
        }
    }

    #[test]
    fn empty_allowed_yields_no_files() {
        let out = parse(&filter_diff(sample().to_string().as_bytes(), &set(&[])));
        assert_eq!(out["files"].as_array().unwrap().len(), 0);
    }

    #[test]
    fn matches_rename_by_old_or_new_path() {
        let body = json!({
            "files": [ { "path": "src/new.ts", "oldPath": "src/old.ts", "status": "renamed" } ]
        })
        .to_string();
        // matched by new path
        assert_eq!(
            parse(&filter_diff(body.as_bytes(), &set(&["src/new.ts"])))["files"]
                .as_array()
                .unwrap()
                .len(),
            1
        );
        // matched by old path (skill may have grouped under the pre-rename name)
        assert_eq!(
            parse(&filter_diff(body.as_bytes(), &set(&["src/old.ts"])))["files"]
                .as_array()
                .unwrap()
                .len(),
            1
        );
        // unrelated → dropped
        assert_eq!(
            parse(&filter_diff(body.as_bytes(), &set(&["src/other.ts"])))["files"]
                .as_array()
                .unwrap()
                .len(),
            0
        );
    }

    #[test]
    fn fail_open_when_no_files_array() {
        let body = json!({ "error": "no diff", "isEmpty": true }).to_string();
        let out = filter_diff(body.as_bytes(), &set(&["src/a.ts"]));
        assert_eq!(
            parse(&out),
            parse(body.as_bytes()),
            "body without files must pass through unchanged"
        );
    }

    #[test]
    fn fail_open_when_not_json() {
        let body = b"<html>not json</html>";
        assert_eq!(filter_diff(body, &set(&["x"])), body.to_vec());
    }

    #[test]
    fn ungrouped_keeps_only_files_absent_from_the_guide() {
        // Guide covers a.ts + c.ts; b.ts is the "new" file.
        let out = parse(&filter_ungrouped(
            sample().to_string().as_bytes(),
            &set(&["src/a.ts", "src/c.ts"]),
        ));
        let paths: Vec<&str> = out["files"]
            .as_array()
            .unwrap()
            .iter()
            .map(|f| f["path"].as_str().unwrap())
            .collect();
        assert_eq!(paths, vec!["src/b.ts"]);
    }

    #[test]
    fn ungrouped_empty_guide_keeps_everything() {
        let out = parse(&filter_ungrouped(
            sample().to_string().as_bytes(),
            &set(&[]),
        ));
        assert_eq!(out["files"].as_array().unwrap().len(), 3);
    }

    #[test]
    fn ungrouped_excludes_renames_by_old_or_new_path() {
        let body = json!({
            "files": [ { "path": "src/new.ts", "oldPath": "src/old.ts", "status": "renamed" } ]
        })
        .to_string();
        // guide lists the pre-rename name → excluded from "new"
        assert_eq!(
            parse(&filter_ungrouped(body.as_bytes(), &set(&["src/old.ts"])))["files"]
                .as_array()
                .unwrap()
                .len(),
            0
        );
        // guide unrelated → kept as new
        assert_eq!(
            parse(&filter_ungrouped(body.as_bytes(), &set(&["src/x.ts"])))["files"]
                .as_array()
                .unwrap()
                .len(),
            1
        );
    }

    #[test]
    fn ungrouped_fail_open_when_not_json() {
        let body = b"<html>not json</html>";
        assert_eq!(filter_ungrouped(body, &set(&["x"])), body.to_vec());
    }
}
