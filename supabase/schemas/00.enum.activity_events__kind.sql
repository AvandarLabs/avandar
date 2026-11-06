/**
 * What an activity event records. Each value is one kind of change to a case.
 *
 * Enum values:
 *
 * `comment_created` - A member posted a comment.
 * `comment_edited` - The author changed a comment's body. The payload names
 *   the revision that holds the previous body.
 * `comment_deleted` - The author deleted a comment. The payload names the
 *   revision that holds the deleted body.
 *
 * Planned kinds, documented in docs/case-activity-architecture.md:
 * `case_created`, `case_status_changed`, `case_assigned`,
 * `case_field_value_changed`, `case_external_record`.
 */
create type public.activity_events__kind as enum(
  'comment_created',
  'comment_edited',
  'comment_deleted'
);
