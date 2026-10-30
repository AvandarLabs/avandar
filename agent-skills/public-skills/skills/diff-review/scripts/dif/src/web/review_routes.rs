//! Shell routes that steer where reviewer comments go.
//!
//! They cover the delivery mode (bulk vs eager) and "Send all" for the LLM
//! pane, the GitHub sync state, and the interception of difit's comment save
//! that marks PR-bound comments.
//!
//! difit's browser saves by POSTing its whole thread list to `/api/comments`.
//! When the comment box's destination toggle is set to GitHub, `inject.js` adds
//! an `X-Dif-Destination: github` header to that save. Before forwarding it, we
//! diff the posted threads against what difit holds; the new message ids are
//! the comment just submitted, and they are marked PR-bound *before* difit (and
//! so the poller and the LLM dispatcher) can ever see them.

use std::collections::HashSet;

use serde_json::Value;
use tiny_http::Request;

use super::proxy;
use super::router::Route;
use super::server::{
    Ctx, request_content_type, send_bytes, send_bytes_nostore, send_status, with_query,
};

/// The header `inject.js` sets on a comment save bound for the GitHub PR.
pub const DESTINATION_HEADER: &str = "X-Dif-Destination";

/// Serve one of the comment-steering routes.
pub fn handle(route: &Route, mut request: Request, ctx: &Ctx, query: &str) -> std::io::Result<()> {
    match route {
        Route::DispatchState => {
            send_bytes_nostore(request, 200, "application/json", ctx.dispatch.state_json())
        }
        Route::SetDispatchMode => {
            let mut body = Vec::new();
            request.as_reader().read_to_end(&mut body)?;
            if ctx.dispatch.apply_mode_json(&body) {
                send_bytes_nostore(request, 200, "application/json", ctx.dispatch.state_json())
            } else {
                send_status(request, 400)
            }
        }
        Route::SendAll => {
            ctx.dispatch.request_send_all();
            send_status(request, 202)
        }
        Route::GithubState => send_bytes_nostore(
            request,
            200,
            "application/json",
            ctx.github.snapshot().state_json().to_string().into_bytes(),
        ),
        Route::SaveComments => save_comments(request, ctx, query),
        _ => send_status(request, 404),
    }
}

fn save_comments(mut request: Request, ctx: &Ctx, query: &str) -> std::io::Result<()> {
    let to_github = request
        .headers()
        .iter()
        .any(|h| h.field.equiv(DESTINATION_HEADER) && h.value.as_str() == "github");
    let content_type = request_content_type(&request);
    let mut body = Vec::new();
    request.as_reader().read_to_end(&mut body)?;
    if to_github {
        if let Ok(current) = proxy::get(ctx.difit_port, &with_query("/api/comments-json", query)) {
            ctx.github
                .mark_pending(&new_message_ids(&current.body, &body));
        }
    }
    match proxy::post(
        ctx.difit_port,
        &with_query("/api/comments", query),
        &content_type,
        &body,
    ) {
        Ok(up) => send_bytes(request, up.status, &up.content_type, up.body),
        Err(_) => send_status(request, 502),
    }
}

/// Message ids in a `POST /api/comments` body (`{"threads": [...]}`) that
/// difit's current `/api/comments-json` does not hold yet, in posted order.
///
/// Fails closed: an unreadable current state or body yields no ids, so a
/// comment is never mis-marked as PR-bound.
#[must_use]
pub fn new_message_ids(current: &[u8], posted: &[u8]) -> Vec<String> {
    let (Ok(current), Ok(posted)) = (
        serde_json::from_slice::<Value>(current),
        serde_json::from_slice::<Value>(posted),
    ) else {
        return Vec::new();
    };
    let held: HashSet<&str> = thread_message_ids(&current).collect();
    thread_message_ids(&posted)
        .filter(|id| !held.contains(id))
        .map(str::to_owned)
        .collect()
}

fn thread_message_ids(payload: &Value) -> impl Iterator<Item = &str> {
    payload
        .get("threads")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .filter_map(|thread| thread.get("messages").and_then(Value::as_array))
        .flatten()
        .filter_map(|message| message.get("id").and_then(Value::as_str))
}

#[cfg(test)]
mod tests {
    use super::*;

    const HELD: &[u8] = br#"{"version":2,"threads":[{"id":"t1","messages":[{"id":"m1"}]}]}"#;

    #[test]
    fn finds_a_new_thread_and_a_new_reply() {
        let posted = br#"{"threads":[
            {"id":"t1","messages":[{"id":"m1"},{"id":"m2"}]},
            {"id":"t2","messages":[{"id":"m3"}]}],"baseVersion":2}"#;
        assert_eq!(new_message_ids(HELD, posted), vec!["m2", "m3"]);
    }

    #[test]
    fn an_edit_or_delete_adds_nothing() {
        let posted = br#"{"threads":[{"id":"t1","messages":[{"id":"m1","body":"edited"}]}]}"#;
        assert!(new_message_ids(HELD, posted).is_empty());
        assert!(new_message_ids(HELD, br#"{"threads":[]}"#).is_empty());
    }

    #[test]
    fn unreadable_payloads_mark_nothing() {
        assert!(new_message_ids(b"<html>", br#"{"threads":[]}"#).is_empty());
        assert!(new_message_ids(HELD, b"nope").is_empty());
    }
}
