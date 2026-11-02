//! Shell routes for the GitHub PR.
//!
//! They serve the sync state the browser renders, and queue its requests for
//! the poller's sync pass (pull now, submit the review, viewed-file changes),
//! plus the reviewer's answer to a pull's merge conflicts and the browser's
//! network state.
//!
//! The routes only queue: every GitHub call happens on the poller thread, so
//! they are made one at a time, in order, without blocking a browser request.

use serde_json::Value;
use tiny_http::Request;

use super::router::Route;
use super::server::{Ctx, send_bytes_nostore, send_status};
use crate::github::conflicts::ConflictResolution;
use crate::github::session::{ReviewEvent, SubmitRequest};

/// Serve one of the GitHub routes.
pub fn handle(route: &Route, mut request: Request, ctx: &Ctx) -> std::io::Result<()> {
    let mut body = Vec::new();
    if *route != Route::GithubState {
        request.as_reader().read_to_end(&mut body)?;
    }
    match route {
        Route::GithubState => {
            let state = ctx.github.read(|s| s.session.state_json(&s.registry));
            send_bytes_nostore(
                request,
                200,
                "application/json",
                state.to_string().into_bytes(),
            )
        }
        Route::GithubPull => {
            ctx.github.session(|s| {
                s.pull_requested = true;
                s.reviewer_pull = true;
            });
            send_status(request, 202)
        }
        Route::GithubSubmit => {
            let is_own_pr = ctx.github.read(|s| s.session.is_own_pr());
            match parse_submit(&body, is_own_pr) {
                Ok(submit) => {
                    ctx.github.update_state(|s| {
                        s.registry.queued_submit = Some(submit);
                        s.session.last_submit = None;
                    });
                    send_status(request, 202)
                }
                Err(_) => send_status(request, 400),
            }
        }
        Route::GithubViewed => {
            let changes = parse_viewed(&body);
            ctx.github
                .update(|registry| registry.queued_viewed.extend(changes));
            send_status(request, 202)
        }
        Route::GithubConnection => match parse_connection(&body) {
            Some(online) => {
                ctx.github.session(|s| s.report_connection(online));
                send_status(request, 202)
            }
            None => send_status(request, 400),
        },
        Route::GithubConflicts => match parse_conflict_answer(&body) {
            Some(resolution) => {
                ctx.github.session(|s| s.answer_conflicts(resolution));
                send_status(request, 202)
            }
            None => send_status(request, 400),
        },
        _ => send_status(request, 404),
    }
}

/// Read `{"online": true | false}`: whether the browser has a network.
#[must_use]
pub fn parse_connection(body: &[u8]) -> Option<bool> {
    serde_json::from_slice::<Value>(body).ok()?["online"].as_bool()
}

/// Read `{"resolve": "llm" | "reviewer"}`: who resolves the pull's conflicts.
#[must_use]
pub fn parse_conflict_answer(body: &[u8]) -> Option<ConflictResolution> {
    let value: Value = serde_json::from_slice(body).ok()?;
    value["resolve"]
        .as_str()
        .and_then(ConflictResolution::parse)
}

/// Read `{"event": "COMMENT" | "APPROVE" | "REQUEST_CHANGES", "body": "..."}`.
/// On the reviewer's own PR only `COMMENT` is allowed, as on GitHub.
pub fn parse_submit(body: &[u8], own_pr: bool) -> Result<SubmitRequest, &'static str> {
    let value: Value = serde_json::from_slice(body).map_err(|_| "not JSON")?;
    let event = value["event"]
        .as_str()
        .and_then(ReviewEvent::parse)
        .ok_or("unknown event")?;
    if own_pr && event != ReviewEvent::Comment {
        return Err("GitHub only lets you comment on your own PR");
    }
    Ok(SubmitRequest {
        event,
        body: value["body"].as_str().unwrap_or_default().to_owned(),
    })
}

/// Read `{"changes": [{"path": "...", "viewed": true}, ...]}`, skipping any
/// malformed change.
#[must_use]
pub fn parse_viewed(body: &[u8]) -> Vec<(String, bool)> {
    let Ok(value) = serde_json::from_slice::<Value>(body) else {
        return Vec::new();
    };
    value["changes"]
        .as_array()
        .into_iter()
        .flatten()
        .filter_map(|change| {
            Some((
                change["path"].as_str()?.to_owned(),
                change["viewed"].as_bool()?,
            ))
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn submit_accepts_githubs_events_and_keeps_the_body() {
        let submit =
            parse_submit(br#"{"event":"REQUEST_CHANGES","body":"see notes"}"#, false).unwrap();
        assert_eq!(submit.event, ReviewEvent::RequestChanges);
        assert_eq!(submit.body, "see notes");
        assert!(parse_submit(br#"{"event":"MERGE"}"#, false).is_err());
        assert!(parse_submit(b"nope", false).is_err());
    }

    #[test]
    fn own_pr_only_takes_comments() {
        assert!(parse_submit(br#"{"event":"APPROVE"}"#, true).is_err());
        assert!(parse_submit(br#"{"event":"COMMENT"}"#, true).is_ok());
    }

    #[test]
    fn a_conflict_answer_names_who_resolves() {
        assert_eq!(
            parse_conflict_answer(br#"{"resolve":"llm"}"#),
            Some(ConflictResolution::Llm)
        );
        assert_eq!(
            parse_conflict_answer(br#"{"resolve":"reviewer"}"#),
            Some(ConflictResolution::Reviewer)
        );
        assert_eq!(parse_conflict_answer(br#"{"resolve":"later"}"#), None);
        assert_eq!(parse_conflict_answer(b"nope"), None);
    }

    #[test]
    fn the_connection_report_is_online_or_offline() {
        assert_eq!(parse_connection(br#"{"online":true}"#), Some(true));
        assert_eq!(parse_connection(br#"{"online":false}"#), Some(false));
        assert_eq!(parse_connection(br#"{"online":"yes"}"#), None);
        assert_eq!(parse_connection(b"nope"), None);
    }

    #[test]
    fn viewed_changes_skip_malformed_entries() {
        let changes = parse_viewed(
            br#"{"changes":[{"path":"a.rs","viewed":true},{"path":"b.rs"},{"viewed":false},
                {"path":"c.rs","viewed":false}]}"#,
        );
        assert_eq!(
            changes,
            vec![("a.rs".to_owned(), true), ("c.rs".to_owned(), false)]
        );
    }
}
