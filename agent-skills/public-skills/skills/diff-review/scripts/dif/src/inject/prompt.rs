//! Building the prompt typed into the LLM pane for one reviewer comment.
//!
//! The prompt is deliberately minimal: it names the file and line (or line
//! range), quotes the comment, and hands off to the `/diff-review` skill.
//! Everything about *how* to respond (classify question vs change request,
//! the commit policy, composing a valid import-shape reply, POSTing it to the
//! live difit server, and what to print in chat) lives in that skill, which
//! reads the port and comparison from `dif`'s `.difit/.session-*.json` file.
//! Keeping it out of the prompt means we don't re-explain the contract on every
//! single comment.

use super::dispatch::{PendingComment, location_label};

/// Build the prompt for `comment`: location, the quoted body, and a handoff to
/// the `/diff-review` skill.
#[must_use]
pub fn build_prompt(comment: &PendingComment) -> String {
    let location = location_label(comment.file_path.as_deref(), &comment.line_label);
    format!(
        "New review comment on {location}:\n\
         \"{body}\"\n\n\
         Address it using the /diff-review skill.",
        body = comment.body,
    )
}

/// Build one prompt for a bulk "Send all": every comment's location and quoted
/// body, numbered, then a single handoff to the `/diff-review` skill.
///
/// One prompt for the whole pass keeps the per-prompt overhead (and the skill
/// load it triggers) to once per batch instead of once per comment. A single
/// comment reads exactly like an eager one.
#[must_use]
pub fn build_batch_prompt(comments: &[PendingComment]) -> String {
    if let [only] = comments {
        return build_prompt(only);
    }
    let items: Vec<String> = comments
        .iter()
        .enumerate()
        .map(|(index, comment)| {
            let location = location_label(comment.file_path.as_deref(), &comment.line_label);
            format!("{}. On {location}:\n\"{}\"", index + 1, comment.body)
        })
        .collect();
    format!(
        "{count} new review comments:\n\n{items}\n\n\
         Address them using the /diff-review skill.",
        count = comments.len(),
        items = items.join("\n\n"),
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    fn comment() -> PendingComment {
        PendingComment {
            message_id: "m1".to_owned(),
            file_path: Some("src/a.rs".to_owned()),
            line_label: "L42".to_owned(),
            body: "drop this fallback".to_owned(),
        }
    }

    #[test]
    fn prompt_names_location_and_body() {
        let p = build_prompt(&comment());
        assert!(p.contains("src/a.rs:L42"));
        assert!(p.contains("drop this fallback"));
    }

    #[test]
    fn prompt_hands_off_to_the_skill() {
        let p = build_prompt(&comment());
        assert!(p.contains("/diff-review skill"));
    }

    #[test]
    fn prompt_stays_minimal_no_policy_or_endpoint() {
        // The contract (commit policy, POST endpoint, reply shape) lives in the
        // skill now, not in every injected prompt.
        let p = build_prompt(&comment());
        assert!(!p.contains("commit"), "no commit policy in the prompt: {p}");
        assert!(
            !p.contains("api/comment-imports"),
            "no endpoint in the prompt: {p}"
        );
    }

    #[test]
    fn batch_prompt_numbers_every_comment_with_one_handoff() {
        let second = PendingComment {
            message_id: "m2".to_owned(),
            file_path: Some("src/b.rs".to_owned()),
            line_label: "L7-9".to_owned(),
            body: "rename this".to_owned(),
        };
        let p = build_batch_prompt(&[comment(), second]);
        assert!(p.starts_with("2 new review comments"), "{p}");
        assert!(
            p.contains("1. On src/a.rs:L42:\n\"drop this fallback\""),
            "{p}"
        );
        assert!(p.contains("2. On src/b.rs:L7-9:\n\"rename this\""), "{p}");
        assert_eq!(p.matches("/diff-review skill").count(), 1);
    }

    #[test]
    fn batch_of_one_reads_like_a_single_comment() {
        assert_eq!(build_batch_prompt(&[comment()]), build_prompt(&comment()));
    }

    #[test]
    fn missing_file_falls_back_to_the_diff() {
        let c = PendingComment {
            file_path: None,
            line_label: String::new(),
            ..comment()
        };
        let p = build_prompt(&c);
        assert!(p.contains("the diff"));
    }
}
