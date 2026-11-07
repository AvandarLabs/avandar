/**
 * Every gadget a comment references, mirrored from the comment's stored
 * document by `comments__sync_gadget_refs` so backlinks and notifications
 * can find references without scanning bodies. Owned by that trigger.
 * `gadget_id` has no foreign key because it points at one of several tables;
 * a reference to a deleted gadget stays until the comment is edited.
 */
create table public.comment_gadget_refs (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- The comment that references the gadget
  comment_id uuid not null references public.comments (id) on update cascade on delete cascade,
  -- Workspace of the comment
  workspace_id uuid not null references public.workspaces (id) on update cascade on delete cascade,
  -- Which kind of gadget
  gadget_type public.gadget_type not null,
  -- The gadget's id. For a dashboard tile, the dashboard's id.
  gadget_id uuid not null,
  -- The tile's block id for a dashboard tile, else null
  sub_id text,
  -- Whether the comment shows the gadget as an inline link or an embed card
  display text not null,
  -- When the reference was recorded
  created_at timestamptz not null default now(),
  constraint comment_gadget_refs__display_valid check (display in ('link', 'embed'))
);

create unique index idx_comment_gadget_refs__unique_ref on public.comment_gadget_refs (
  comment_id,
  gadget_type,
  gadget_id,
  coalesce(sub_id, ''),
  display
);

create index idx_comment_gadget_refs__gadget on public.comment_gadget_refs (gadget_type, gadget_id);

create index idx_comment_gadget_refs__workspace_id on public.comment_gadget_refs (workspace_id);

alter table public.comment_gadget_refs enable row level security;

-- Data API privileges. Members read; only the trigger writes.
grant
select
  on table public.comment_gadget_refs to authenticated;

grant
select
,
  insert,
update,
delete on table public.comment_gadget_refs to service_role;

create policy "User can SELECT comment_gadget_refs in their workspace" on public.comment_gadget_refs for
select
  to authenticated using (
    public.comment_gadget_refs.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  );
