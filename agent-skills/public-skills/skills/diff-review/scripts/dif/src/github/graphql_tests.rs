//! Tests for [`super`] (the GraphQL documents and answer parsing), kept beside
//! it so the module stays readable.

use serde_json::json;

use super::*;

#[test]
fn graphql_errors_become_errors() {
    let err = parse_data_from_answer(
        r#"{"data":null,"errors":[{"message":"Line could not be resolved"}]}"#,
    )
    .unwrap_err();
    assert_eq!(err.to_string(), "Line could not be resolved");
    assert_eq!(
        parse_data_from_answer(r#"{"data":{"x":1}}"#).unwrap()["x"],
        1
    );
}

#[test]
fn finds_only_the_viewers_pending_review() {
    let answer = json!({"node":{"reviews":{"nodes":[
        {"id":"R_other","viewerDidAuthor":false},
        {"id":"R_mine","viewerDidAuthor":true}]}}});
    assert_eq!(parse_pending_review(&answer).as_deref(), Some("R_mine"));
    assert_eq!(
        parse_pending_review(&json!({"node":{"reviews":{"nodes":[]}}})),
        None
    );
}

#[test]
fn parses_a_new_thread_and_reply() {
    let thread = json!({"addPullRequestReviewThread":{"thread":{"id":"T1",
        "comments":{"nodes":[{"id":"C1","url":"https://x/1"}]}}}});
    assert_eq!(
        parse_added_thread(&thread).unwrap(),
        Posted {
            node_id: "C1".to_owned(),
            thread_id: "T1".to_owned(),
            url: "https://x/1".to_owned(),
        }
    );
    let missing = json!({"addPullRequestReviewThread":{"thread":null}});
    assert!(
        parse_added_thread(&missing)
            .unwrap_err()
            .to_string()
            .contains("part of the PR")
    );

    let reply = json!({"addPullRequestReviewThreadReply":{"comment":{"id":"C2","url":"u"}}});
    assert_eq!(parse_added_reply(&reply, "T1").unwrap().thread_id, "T1");
}

#[test]
fn parses_threads_with_bots_ranges_and_outdated_lines() {
    let answer = json!({"node":{"headRefOid":"abc","reviewThreads":{
        "pageInfo":{"hasNextPage":true,"endCursor":"CUR"},
        "nodes":[
          {"id":"T1","isResolved":false,"path":"a.rs","line":12,"startLine":10,
           "diffSide":"RIGHT","originalLine":12,"originalStartLine":10,
           "comments":{"pageInfo":{"hasNextPage":false},"nodes":[
             {"id":"C1","body":"nit","url":"u1","createdAt":"t0","updatedAt":"t1",
              "state":"SUBMITTED","viewerDidAuthor":false,
              "author":{"login":"coderabbitai","__typename":"Bot"}},
             {"id":"C2","body":"draft","url":"u2","createdAt":"t0","updatedAt":"t1",
              "state":"PENDING","viewerDidAuthor":true,
              "author":{"login":"jpsyx","__typename":"User"}}]}},
          {"id":"T2","isResolved":true,"path":"b.rs","line":null,"startLine":null,
           "diffSide":"LEFT","originalLine":4,"originalStartLine":4,
           "comments":{"pageInfo":{"hasNextPage":true},"nodes":[]}}]}}});
    let (head, threads, cursor) = parse_threads_page(&answer).unwrap();
    assert_eq!(head, "abc");
    assert_eq!(cursor.as_deref(), Some("CUR"));
    assert_eq!((threads[0].start_line, threads[0].line), (Some(10), 12));
    assert_eq!(threads[0].comments[0].author, "coderabbitai[bot]");
    assert!(threads[0].comments[1].pending && threads[0].comments[1].viewer_did_author);
    assert_eq!(
        (threads[1].side, threads[1].line, threads[1].start_line),
        (Side::Left, 4, None)
    );
    assert!(threads[1].resolved && !threads[1].complete);
}

#[test]
fn parses_viewed_files() {
    let answer = json!({"node":{"files":{"pageInfo":{"hasNextPage":false},"nodes":[
        {"path":"a.rs","viewerViewedState":"VIEWED"},
        {"path":"b.rs","viewerViewedState":"DISMISSED"}]}}});
    let (files, cursor) = parse_files_page(&answer).unwrap();
    assert_eq!(
        files,
        vec![
            ("a.rs".to_owned(), ViewedState::Viewed),
            ("b.rs".to_owned(), ViewedState::Dismissed)
        ]
    );
    assert_eq!(cursor, None);
}
