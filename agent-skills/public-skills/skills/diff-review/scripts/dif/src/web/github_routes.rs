//! Shell routes for the GitHub PR: the sync state the browser renders, and the
//! requests it queues for the poller's sync pass (pull now, submit the review,
//! viewed-file changes).
//!
//! The routes only queue: every GitHub call happens on the poller thread, so
//! they are made one at a time, in order, without blocking a browser request.

use serde_json::Value;
use tiny_http::Request;

use super::router::Route;
use super::server::{Ctx, send_bytes_nostore, send_status};
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
            ctx.github.session(|s| s.pull_requested = true);
            send_status(request, 202)
        }
        Route::GithubSubmit => {
            let is_own_pr = ctx.github.read(|s| s.session.is_own_pr());
            match parse_submit(&body, is_own_pr) {
                Ok(submit) => {
                    ctx.github.session(|s| {
                        s.submit = Some(submit);
                        s.last_submit = None;
                    });
                    send_status(request, 202)
                }
                Err(_) => send_status(request, 400),
            }
        }
        Route::GithubViewed => {
            let changes = parse_viewed(&body);
            ctx.github.session(|s| s.viewed.queue.extend(changes));
            send_status(request, 202)
        }
        _ => send_status(request, 404),
    }
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
