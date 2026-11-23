/**
 * One member's reaction to one comment. A member has at most one reaction
 * per comment: changing it is an upsert on `(comment_id, user_id)`.
 * Reactions are not activity and write no events.
 */
create table public.comment_reactions (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- The comment reacted to
  comment_id uuid not null references public.comments (id) on update cascade on delete cascade,
  -- Who reacted
  user_id uuid not null default auth.uid () references auth.users (id) on update cascade on delete cascade,
  -- Workspace of the comment, kept here for the RLS predicate
  workspace_id uuid not null references public.workspaces (id) on update cascade on delete cascade,
  -- Which reaction
  kind public.comment_reactions__kind not null,
  -- Timestamp of the first reaction
  created_at timestamptz not null default now(),
  -- Timestamp of the last change of reaction
  updated_at timestamptz not null default now(),
  constraint comment_reactions__one_per_user unique (comment_id, user_id)
);

create index idx_comment_reactions__workspace_id on public.comment_reactions (workspace_id);

create index idx_comment_reactions__user_id on public.comment_reactions (user_id);

alter table public.comment_reactions enable row level security;

-- Data API privileges. `UPDATE` stays table-wide rather than column-scoped
-- because a PostgREST upsert updates every column in its payload, and the
-- policies already pin `user_id` and the comment.
grant
select
,
  insert,
update,
delete on table public.comment_reactions to authenticated,
service_role;

create policy "User can SELECT comment_reactions in their workspace" on public.comment_reactions for
select
  to authenticated using (
    public.comment_reactions.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  );

create policy "User can INSERT their own reaction to a live comment" on public.comment_reactions for insert to authenticated
with
  check (
    public.comment_reactions.user_id = (
      select
        auth.uid ()
    ) and
    exists (
      select
        1
      from
        public.comments c
      where
        c.id = public.comment_reactions.comment_id and
        c.workspace_id = public.comment_reactions.workspace_id and
        c.deleted_at is null
    )
  );

create policy "User can UPDATE their own reaction to a live comment" on public.comment_reactions
for update
  to authenticated using (
    public.comment_reactions.user_id = (
      select
        auth.uid ()
    )
  )
with
  check (
    public.comment_reactions.user_id = (
      select
        auth.uid ()
    ) and
    exists (
      select
        1
      from
        public.comments c
      where
        c.id = public.comment_reactions.comment_id and
        c.workspace_id = public.comment_reactions.workspace_id and
        c.deleted_at is null
    )
  );

create policy "User can DELETE their own reaction" on public.comment_reactions for delete to authenticated using (
  public.comment_reactions.user_id = (
    select
      auth.uid ()
  )
);

create trigger tr__comment_reactions__set_updated_at before
update on public.comment_reactions for each row
execute function public.util__set_updated_at ();
