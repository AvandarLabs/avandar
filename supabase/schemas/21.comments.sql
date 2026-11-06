/**
 * A comment on a case. Holds only the comment's current state: every earlier
 * body is kept in `comment_revisions` and every change is logged in
 * `activity_events`, both by the triggers in
 * `23.comments__audit_triggers.sql`. Deleting is soft: the author sets
 * `deleted_at` and a trigger clears the body.
 */
create table public.comments (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Workspace this comment belongs to
  workspace_id uuid not null references public.workspaces (id) on update cascade on delete cascade,
  -- The case this comment is on. A later subject (a dashboard, a dataset)
  -- adds its own nullable column and joins `comments__exactly_one_subject`.
  individual_id uuid references public.individuals (id) on update cascade on delete cascade,
  -- Author. Cleared if the auth user is deleted, so the comment outlives them.
  author_user_id uuid default auth.uid () references auth.users (id) on update cascade on delete set null,
  -- The rich text document as ProseMirror JSON. Null only once deleted.
  body jsonb,
  -- Version of the document shape in `body`
  body_schema_version smallint not null default 1,
  -- Plain text of `body`, for previews, length checks, and future search and
  -- notifications. Null only once deleted.
  body_text text,
  -- Timestamp of when the comment was posted
  created_at timestamptz not null default now(),
  -- Timestamp of the last change to the row
  updated_at timestamptz not null default now(),
  -- Set by trigger when `body` changes
  edited_at timestamptz,
  -- Set when the author deletes the comment
  deleted_at timestamptz,
  constraint comments__exactly_one_subject check (num_nonnulls (individual_id) = 1),
  constraint comments__body_present_unless_deleted check (
    (deleted_at is null) = (
      body is not null and
      body_text is not null
    )
  ),
  constraint comments__body_text_length check (char_length(body_text) <= 10000),
  constraint comments__body_size check (pg_column_size(body) <= 262144)
);

create index idx_comments__individual_created on public.comments (individual_id, created_at);

alter table public.comments enable row level security;

-- Data API privileges. Members insert and read. Authors change only the body
-- columns and `deleted_at`; there is no DELETE grant because deleting is
-- setting `deleted_at`.
grant
select
,
  insert on table public.comments to authenticated;

grant
update (
  body,
  body_schema_version,
  body_text,
  deleted_at
) on public.comments to authenticated;

grant
select
,
  insert,
update,
delete on table public.comments to service_role;

create policy "User can SELECT comments in their workspace" on public.comments for
select
  to authenticated using (
    public.comments.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  );

create policy "User can INSERT their own comments in their workspace" on public.comments for insert to authenticated
with
  check (
    public.comments.author_user_id = (
      select
        auth.uid ()
    ) and
    public.comments.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  );

create policy "Author can UPDATE their own live comments" on public.comments
for update
  to authenticated using (
    public.comments.author_user_id = (
      select
        auth.uid ()
    ) and
    public.comments.deleted_at is null and
    public.comments.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  )
with
  check (
    public.comments.author_user_id = (
      select
        auth.uid ()
    ) and
    public.comments.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  );

/**
 * Keeps a comment on its case: the case must be in the comment's workspace,
 * the subject, workspace, and author never change after posting (except the
 * author becoming null when their account is deleted), and a deleted comment
 * is never restored.
 */
create or replace function public.comments__validate_subject () returns trigger language plpgsql security definer
set
  search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    if new.individual_id is distinct from old.individual_id
      or new.workspace_id is distinct from old.workspace_id
      or (new.author_user_id is distinct from old.author_user_id and new.author_user_id is not null)
    then
      raise exception 'A comment cannot move to another case, workspace, or author'
        using errcode = '22023';
    end if;
    if old.deleted_at is not null and new.deleted_at is null then
      raise exception 'A deleted comment cannot be restored'
        using errcode = '22023';
    end if;
  end if;

  if new.individual_id is not null and not exists (
    select 1
    from public.individuals i
    where i.id = new.individual_id and i.workspace_id = new.workspace_id
  ) then
    raise exception 'The case belongs to a different workspace'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke
execute on function public.comments__validate_subject ()
from
  public,
  anon,
  authenticated,
  service_role;

create trigger tr__comments__validate_subject before insert or
update on public.comments for each row
execute function public.comments__validate_subject ();

create trigger tr__comments__set_updated_at before
update on public.comments for each row
execute function public.util__set_updated_at ();
