create type public.workspace_invites__status as enum('pending', 'accepted');

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
  -- Legacy workspace role mirror (`admin` | `member`) for older clients and
  -- invite rows created before `role_group_id` existed.
  role text not null,
  -- Role group chosen when the invite was sent (built-in or custom).
  -- When the user accepts the invite, the server merges `role_overrides`
  -- with the role group's matrix to compute a new role matrix.
  -- If the result equals the `role_group_id`'s matrix, then the member
  -- keeps that role group. Otherwise, a new custom role group is inserted.
  role_group_id uuid references public.role_groups (id) on update cascade on delete set null,
  -- JSON array of `{"app":"data_sources","role":"editor"}` overrides applied
  -- on top of `role_group_id` when the invite is accepted.
  role_overrides jsonb not null default '[]'::jsonb,
  -- Tag groups the member should join after accepting the invite.
  invite_user_group_ids uuid[] not null default '{}'::uuid[],
  -- the status of the invite
  invite_status public.workspace_invites__status not null,
  -- Timestamp of when the invite was created
  created_at timestamptz not null default now(),
  -- Timestamp of when the invite was last updated
  updated_at timestamptz not null default now()
);

create index idx_workspace_invites__pending_email on public.workspace_invites (lower(email))
where
  invite_status = 'pending';

-- Enable row level security
alter table public.workspace_invites enable row level security;

-- Data API privileges.
grant
select
,
  insert,
update,
delete on table public.workspace_invites to authenticated;

-- Policies
create policy "User can select invites they sent from their workspace" on public.workspace_invites for
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

create policy "Settings admins can select workspace invites" on public.workspace_invites for
select
  to authenticated using (
    exists (
      select
        1
      from
        public.workspace_memberships wm
        inner join public.role_group_app_roles rgar on rgar.role_group_id = wm.role_group_id
      where
        wm.workspace_id = public.workspace_invites.workspace_id and
        wm.user_id = auth.uid () and
        rgar.app = 'settings'::public.app_type and
        rgar.role = 'admin'::public.role_level
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

create policy "Settings admins can update any workspace invite" on public.workspace_invites
for update
  to authenticated using (
    exists (
      select
        1
      from
        public.workspace_memberships wm
        inner join public.role_group_app_roles rgar on rgar.role_group_id = wm.role_group_id
      where
        wm.workspace_id = public.workspace_invites.workspace_id and
        wm.user_id = auth.uid () and
        rgar.app = 'settings'::public.app_type and
        rgar.role = 'admin'::public.role_level
    )
  )
with
  check (
    exists (
      select
        1
      from
        public.workspace_memberships wm
        inner join public.role_group_app_roles rgar on rgar.role_group_id = wm.role_group_id
      where
        wm.workspace_id = public.workspace_invites.workspace_id and
        wm.user_id = auth.uid () and
        rgar.app = 'settings'::public.app_type and
        rgar.role = 'admin'::public.role_level
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

create policy "Settings admins can delete any workspace invite" on public.workspace_invites for delete to authenticated using (
  exists (
    select
      1
    from
      public.workspace_memberships wm
      inner join public.role_group_app_roles rgar on rgar.role_group_id = wm.role_group_id
    where
      wm.workspace_id = public.workspace_invites.workspace_id and
      wm.user_id = auth.uid () and
      rgar.app = 'settings'::public.app_type and
      rgar.role = 'admin'::public.role_level
  )
);

-- Trigger the `updated_at` update
create trigger tr_workspace_invites__set_updated_at before
update on public.workspace_invites for each row
execute function public.util__set_updated_at ();
