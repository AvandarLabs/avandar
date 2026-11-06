# Case activity architecture

How a case records everything that happens to it, and how the activity feed
on the record page reads that record. Spec:
[2026-11-06-case-comments-design.md](superpowers/specs/2026-11-06-case-comments-design.md).

## The model

| Table | Holds | Written by |
| --- | --- | --- |
| `comments` | Each comment's current state | Members (insert), authors (body and `deleted_at`) |
| `comment_revisions` | Every body a comment had before its current one | `comments__record_revision` only |
| `comment_reactions` | One reaction per member per comment | Members, for themselves |
| `comment_mentions` | Members a comment mentions | `comments__sync_mentions` only |
| `activity_events` | Append-only log of every change to a case | Database triggers only |

Schemas: `supabase/schemas/21.comments.sql`, `22.*.sql`,
`23.comments__audit_triggers.sql`, and the feed function
`50.rpc_activity_events__get_case_page.sql`. Tests:
`supabase/tests/database/case_activity/` (`comment_audit_triggers`,
`activity_page`) and
`supabase/tests/database/permissions/rls_case_activity.test.sql`.

Details worth knowing:

- `comment_reactions` has an `id` primary key plus a unique
  `(comment_id, user_id)` constraint, so a member holds one reaction per
  comment.
- On insert, `comments__validate_subject` forces `created_at` and
  `updated_at` to `now()` and `edited_at` and `deleted_at` to null, so a
  client cannot backdate a comment or post one already edited or deleted.
- A comment counts as edited when any of `body`, `body_text`, or
  `body_schema_version` changes. The audit trigger then stores the old body
  as an `edit` revision, stamps `edited_at`, and logs `comment_edited`.

## Why only triggers write the log

An audit log a client can skip is not an audit log. Triggers fire for every
write path (the app, chat, a future API, the service role), so
`authenticated` has `SELECT` and nothing else on `activity_events`.

## Event kinds

| Kind | Status | Payload |
| --- | --- | --- |
| `comment_created` | Built | `{}` |
| `comment_edited` | Built | `{ "revision_id": uuid }` |
| `comment_deleted` | Built | `{ "revision_id": uuid }` |
| `case_created` | Planned (P5c.5) | `{}` |
| `case_status_changed` | Planned (P5c.5) | `{ "from": text, "to": text }` |
| `case_assigned` | Planned (P5c.3) | `{ "from_user_id": uuid, "to_user_id": uuid }` |
| `case_field_value_changed` | Planned (P5c.7) | `{ "attribute_id": uuid, "from": json, "to": json }` |
| `case_external_record` | Planned | `{ "provider": text, "external_id": text, "summary": text }` |

Adding a kind: add the enum value, write it from a trigger on the table that
changes, add a row component to `activityFeedItemRenderers`, and document
its payload here. Reactions never write events.

## History from connected services

External history arrives with `source = 'external'`, a null
`actor_user_id`, `occurred_at` set to the third party's timestamp, and an
`external_id` in the payload so re-imports are idempotent. The feed orders
by `occurred_at`, so pulled history lands where it happened, not where
Avandar learned of it.

## The feed

Code: `src/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/`.
`activityFeedItemRenderers` maps each kind to a row component, or to `null`
for kinds that change an existing row (an edit changes the comment card).
The feed query asks only for kinds with a row.

Reads go through `public.rpc_activity_events__get_case_page`, a
security-invoker SQL function, so the `activity_events` RLS policy decides
what each caller sees. It pages on the keyset
`(occurred_at, recorded_at, id)`, newest first, which
`idx_activity_events__individual_occurred` covers. The full keyset means
events that share a timestamp are never skipped or repeated across pages.
On the client, `ActivityEventClient.getCaseActivityPage` takes
`before: ActivityFeedCursor` (`undefined` for the first page).

Comments are addressable by id. The record route
(`src/routes/_auth/$workspaceSlug/individual-manager/$conceptId/$individualId.tsx`)
takes an optional `?comment=<id>` search param, and a malformed id is dropped
rather than failing the page. "Copy link to comment" builds that URL. The
record page passes the id to the feed as `highlightedCommentId`, and the feed
pages back (up to 10 pages) until it finds that comment, then scrolls to it
and highlights it.

## Rich text

`src/components/RichText/` holds one extension list
(`createRichTextExtensions`) used by both the composer and the static
renderer (`RichTextView`), so they cannot disagree. Documents are stored as
ProseMirror JSON with `body_schema_version`, validated by
`shared/models/RichTextDocument`.

Links are limited to `http`, `https`, and `mailto`. The model function
`isSafeLinkHref` in `shared/models/RichTextDocument/RichTextDocument.ts`
defines the rule, and the stored schema and the editor both use it. The
editor's `SafeLink` extension (`src/components/RichText/SafeLink/SafeLink.ts`)
adds `https://` to a bare domain and `mailto:` to a bare email address, and
refuses any other scheme, so the editor never makes a link the save would
reject.

## Extension points for object references and embeds

This is planned in the roadmap and not built.

- Add `objectRef` (inline) and `objectEmbed` (block) nodes to
  `createRichTextExtensions` with shared attributes, and map both in
  `RichTextView`'s `nodeMapping`.
- Extract references into a `comment_references` table with a trigger
  modeled on `comments__sync_mentions`.

## Future work

- Notifications for mentions and activity (P5c.8), reading `comment_mentions`.
- A workspace-wide activity feed.
- Live updates with Supabase Realtime.
- The time of the latest activity as a record header fact.
- A notice when a linked comment is older than the 10 pages the feed will
  load to find it.
- Setting `deleted_at` from the server clock rather than the client.
- Links to a host and port without a scheme, such as `localhost:3000`.
- A viewer for a comment's earlier versions, readable by workspace admins.
- Admin moderation of other members' comments.
- Mentioning user groups.
- Queueing posts made while offline.
- Comments on dashboards, datasets, and maps (each adds a subject column).
