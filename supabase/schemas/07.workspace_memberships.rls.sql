--------------------------------------------------------------------------------
-- Policies: workspace_memberships (role group assignment)
--------------------------------------------------------------------------------
create policy "Settings admins can update workspace membership role group" on public.workspace_memberships
for update
  to authenticated using (
    public.util__is_settings_admin (
      public.workspace_memberships.workspace_id
    )
  )
with
  check (
    public.util__is_settings_admin (
      public.workspace_memberships.workspace_id
    ) and
    public.workspace_memberships.role_group_id is not null and
    exists (
      select
        1
      from
        public.role_groups rg
      where
        rg.id = public.workspace_memberships.role_group_id and
        rg.workspace_id = public.workspace_memberships.workspace_id
    )
  );
