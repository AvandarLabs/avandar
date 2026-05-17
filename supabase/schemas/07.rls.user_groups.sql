--------------------------------------------------------------------------------
-- Policies: user_groups
--------------------------------------------------------------------------------
create policy "Members can select user_groups in their workspaces" on public.user_groups for
select
  to authenticated using (
    public.user_groups.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  );

create policy "Settings admins can insert user_groups" on public.user_groups for insert to authenticated
with
  check (
    public.util__is_settings_admin (
      public.user_groups.workspace_id
    )
  );

create policy "Settings admins can update user_groups" on public.user_groups
for update
  to authenticated using (
    public.util__is_settings_admin (
      public.user_groups.workspace_id
    )
  )
with
  check (
    public.util__is_settings_admin (
      public.user_groups.workspace_id
    )
  );

create policy "Settings admins can delete user_groups" on public.user_groups for delete to authenticated using (
  public.util__is_settings_admin (
    public.user_groups.workspace_id
  )
);
