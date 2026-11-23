/**
 * Workspace members a comment mentions. Owned by `comments__sync_mentions`,
 * which rebuilds a comment's rows from its stored document on every body
 * change. Future notifications read this table.
 */
create table public.comment_mentions (
  -- The comment that mentions someone
  comment_id uuid not null references public.comments (id) on update cascade on delete cascade,
  -- The member mentioned
  mentioned_user_id uuid not null references auth.users (id) on update cascade on delete cascade,
  -- Workspace of the comment
  workspace_id uuid not null references public.workspaces (id) on update cascade on delete cascade,
  -- When the mention was recorded
  created_at timestamptz not null default now(),
  primary key (comment_id, mentioned_user_id)
);

create index idx_comment_mentions__mentioned_user on public.comment_mentions (mentioned_user_id);

create index idx_comment_mentions__workspace_id on public.comment_mentions (workspace_id);

alter table public.comment_mentions enable row level security;

-- Data API privileges. Members read; only the trigger writes.
grant
select
  on table public.comment_mentions to authenticated;

grant
select
,
  insert,
update,
delete on table public.comment_mentions to service_role;

create policy "User can SELECT comment_mentions in their workspace" on public.comment_mentions for
select
  to authenticated using (
    public.comment_mentions.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  );
