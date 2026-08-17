--------------------------------------------------------------------------------
-- Policies: role_group_app_roles
--------------------------------------------------------------------------------
create policy "Members can select role_group_app_roles" on public.role_group_app_roles for
select
  to authenticated using (
    exists (
      select
        1
      from
        public.role_groups rg
      where
        rg.id = public.role_group_app_roles.role_group_id and
        rg.workspace_id = any (
          array(
            select
              public.util__get_auth_user_workspaces ()
          )
        )
    )
  );

create policy "Settings admins can insert role_group_app_roles" on public.role_group_app_roles for insert to authenticated
with
  check (
    exists (
      select
        1
      from
        public.role_groups rg
      where
        rg.id = public.role_group_app_roles.role_group_id and
        public.util__is_settings_admin (rg.workspace_id)
    )
  );

create policy "Settings admins can update role_group_app_roles" on public.role_group_app_roles
for update
  to authenticated using (
    exists (
      select
        1
      from
        public.role_groups rg
      where
        rg.id = public.role_group_app_roles.role_group_id and
        public.util__is_settings_admin (rg.workspace_id)
    )
  )
with
  check (
    exists (
      select
        1
      from
        public.role_groups rg
      where
        rg.id = public.role_group_app_roles.role_group_id and
        public.util__is_settings_admin (rg.workspace_id)
    )
  );

create policy "Settings admins can delete role_group_app_roles" on public.role_group_app_roles for delete to authenticated using (
  exists (
    select
      1
    from
      public.role_groups rg
    where
      rg.id = public.role_group_app_roles.role_group_id and
      public.util__is_settings_admin (rg.workspace_id)
  )
);
