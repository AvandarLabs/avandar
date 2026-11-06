/**
 * Every body a comment has had before its current one, kept for audit.
 * Written only by `comments__record_revision`. No member can read it yet:
 * a viewer for earlier versions is future work.
 */
create table public.comment_revisions (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Workspace of the comment
  workspace_id uuid not null references public.workspaces (id) on update cascade on delete cascade,
  -- The comment this revision belongs to
  comment_id uuid not null references public.comments (id) on update cascade on delete cascade,
  -- Whether the body was replaced by an edit or removed by a delete
  reason public.comment_revisions__reason not null,
  -- The body before the change
  body jsonb not null,
  -- Version of the document shape in `body`
  body_schema_version smallint not null,
  -- Plain text of `body`
  body_text text not null,
  -- Who made the change. Cleared if their account is deleted.
  revised_by_user_id uuid references auth.users (id) on update cascade on delete set null,
  -- When the change happened. Uses the statement's wall clock so two changes
  -- in one transaction still order correctly.
  created_at timestamptz not null default clock_timestamp()
);

create index idx_comment_revisions__comment_created on public.comment_revisions (comment_id, created_at);

alter table public.comment_revisions enable row level security;

-- Data API privileges. Service role only: this is an audit store.
grant
select
,
  insert,
update,
delete on table public.comment_revisions to service_role;
