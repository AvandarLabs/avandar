create type public.workspace_invites__status as enum(
  'pending',
  'accepted'
);

create table public.workspace_invites (
  -- Primary key: the invite ID
  id uuid primary key default gen_random_uuid(),
  -- Workspace this invite belongs to
  workspace_id uuid not null references public.workspaces (id) on update cascade on delete cascade,
  -- User who invited the user
  invited_by uuid not null references auth.users (id) on update cascade on delete cascade,
  -- User this invite is for. Allow null because the user might not exist yet.
  user_id uuid references auth.users (id) on update cascade on delete cascade,
  -- The email address that was invited
  email text not null,
  -- The role of the user invited
  role text not null,
  -- the status of the invite
  invite_status public.workspace_invites__status not null,
  -- Timestamp of when the invite was created
  created_at timestamptz not null default now(),
  -- Timestamp of when the invite was last updated
  updated_at timestamptz not null default now()
);

-- Enable row level security
alter table public.workspace_invites enable row level security;

-- Policies
create policy "
  User can SELECT invites they sent from their workspace
" on public.workspace_invites for
select
  to authenticated using (
    public.workspace_invites.invited_by = (
      select
        auth.uid ()
    ) and
    public.workspace_invites.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  );

create policy "
  User can INSERT invites they sent to their workspace
" on public.workspace_invites for insert to authenticated
with
  check (
    public.workspace_invites.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    ) and
    public.workspace_invites.invited_by = (
      select
        auth.uid ()
    )
  );

create policy "
  User can UPDATE invites they sent in their workspace
" on public.workspace_invites
for update
  to authenticated
with
  check (
    public.workspace_invites.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    ) and
    public.workspace_invites.invited_by = (
      select
        auth.uid ()
    )
  );

create policy "
  User can DELETE invites they sent in their workspace
" on public.workspace_invites for delete to authenticated using (
  public.workspace_invites.workspace_id = any (
    array(
      select
        public.util__get_auth_user_workspaces ()
    )
  ) and
  public.workspace_invites.invited_by = (
    select
      auth.uid ()
  )
);

-- Trigger the `updated_at` update
create trigger tr_workspace_invites__set_updated_at before
update on public.workspace_invites for each row
execute function public.util__set_updated_at ();
