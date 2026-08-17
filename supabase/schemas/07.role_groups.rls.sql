--------------------------------------------------------------------------------
-- Policies: role_groups
--------------------------------------------------------------------------------
create policy "Members can select role_groups in their workspaces" on public.role_groups for
select
  to authenticated using (
    public.role_groups.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  );

-- Lets `rpc_workspaces__create_with_owner` read built-ins before the first
-- membership row exists (membership policy uses this SELECT).
create policy "Owners can select role_groups in owned workspaces" on public.role_groups for
select
  to authenticated using (
    exists (
      select
        1
      from
        public.workspaces w
      where
        w.id = public.role_groups.workspace_id and
        w.owner_id = auth.uid ()
    )
  );

create policy "Settings admins can insert role_groups" on public.role_groups for insert to authenticated
with
  check (
    public.util__is_settings_admin (public.role_groups.workspace_id)
  );

create policy "Settings admins can update role_groups" on public.role_groups
for update
  to authenticated using (
    public.util__is_settings_admin (public.role_groups.workspace_id)
  )
with
  check (
    public.util__is_settings_admin (public.role_groups.workspace_id)
  );

create policy "Settings admins can delete custom role_groups" on public.role_groups for delete to authenticated using (
  public.util__is_settings_admin (public.role_groups.workspace_id) and
  public.role_groups.is_builtin = false
);
