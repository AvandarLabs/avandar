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
