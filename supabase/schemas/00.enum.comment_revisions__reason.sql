/**
 * Why a comment revision was kept.
 *
 * Enum values:
 *
 * `edit` - The author changed the body. The revision holds the body before
 *   the change.
 * `delete` - The author deleted the comment. The revision holds the body
 *   that was deleted.
 */
create type public.comment_revisions__reason as enum('edit', 'delete');
