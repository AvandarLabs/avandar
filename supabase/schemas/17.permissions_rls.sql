------------------------------
-- Policies: user_app_roles
------------------------------
create policy "Members can SELECT user_app_roles in their workspaces" on public.user_app_roles for
select
  to authenticated using (
    public.user_app_roles.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  );

create policy "Settings admins can INSERT user_app_roles" on public.user_app_roles for insert to authenticated
with
  check (
    public.util__is_settings_admin (
      public.user_app_roles.workspace_id
    )
  );

create policy "Settings admins can UPDATE user_app_roles" on public.user_app_roles
for update
  to authenticated using (
    public.util__is_settings_admin (
      public.user_app_roles.workspace_id
    )
  )
with
  check (
    public.util__is_settings_admin (
      public.user_app_roles.workspace_id
    )
  );

create policy "Settings admins can DELETE user_app_roles" on public.user_app_roles for delete to authenticated using (
  public.util__is_settings_admin (
    public.user_app_roles.workspace_id
  )
);

------------------------------
-- Policies: role_groups
------------------------------
create policy "Members can SELECT role_groups in their workspaces" on public.role_groups for
select
  to authenticated using (
    public.role_groups.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  );

create policy "Settings admins can INSERT role_groups" on public.role_groups for insert to authenticated
with
  check (
    public.util__is_settings_admin (
      public.role_groups.workspace_id
    )
  );

create policy "Settings admins can UPDATE role_groups" on public.role_groups
for update
  to authenticated using (
    public.util__is_settings_admin (
      public.role_groups.workspace_id
    )
  )
with
  check (
    public.util__is_settings_admin (
      public.role_groups.workspace_id
    )
  );

create policy "Settings admins can DELETE custom role_groups" on public.role_groups for delete to authenticated using (
  public.util__is_settings_admin (
    public.role_groups.workspace_id
  ) and
  public.role_groups.is_builtin = false
);

------------------------------
-- Policies: role_group_app_roles
------------------------------
create policy "Members can SELECT role_group_app_roles" on public.role_group_app_roles for
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

create policy "Settings admins can INSERT role_group_app_roles" on public.role_group_app_roles for insert to authenticated
with
  check (
    exists (
      select
        1
      from
        public.role_groups rg
      where
        rg.id = public.role_group_app_roles.role_group_id and
        public.util__is_settings_admin (
          rg.workspace_id
        )
    )
  );

create policy "Settings admins can UPDATE role_group_app_roles" on public.role_group_app_roles
for update
  to authenticated using (
    exists (
      select
        1
      from
        public.role_groups rg
      where
        rg.id = public.role_group_app_roles.role_group_id and
        public.util__is_settings_admin (
          rg.workspace_id
        )
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
        public.util__is_settings_admin (
          rg.workspace_id
        )
    )
  );

create policy "Settings admins can DELETE role_group_app_roles" on public.role_group_app_roles for delete to authenticated using (
  exists (
    select
      1
    from
      public.role_groups rg
    where
      rg.id = public.role_group_app_roles.role_group_id and
      public.util__is_settings_admin (
        rg.workspace_id
      )
  )
);

------------------------------
-- Policies: user_groups
------------------------------
create policy "Members can SELECT user_groups in their workspaces" on public.user_groups for
select
  to authenticated using (
    public.user_groups.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  );

create policy "Settings admins can INSERT user_groups" on public.user_groups for insert to authenticated
with
  check (
    public.util__is_settings_admin (
      public.user_groups.workspace_id
    )
  );

create policy "Settings admins can UPDATE user_groups" on public.user_groups
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

create policy "Settings admins can DELETE user_groups" on public.user_groups for delete to authenticated using (
  public.util__is_settings_admin (
    public.user_groups.workspace_id
  )
);

------------------------------
-- Policies: user_group_memberships
------------------------------
create policy "Members can SELECT user_group_memberships" on public.user_group_memberships for
select
  to authenticated using (
    exists (
      select
        1
      from
        public.user_groups ug
      where
        ug.id = public.user_group_memberships.user_group_id and
        ug.workspace_id = any (
          array(
            select
              public.util__get_auth_user_workspaces ()
          )
        )
    )
  );

create policy "Settings admins can INSERT user_group_memberships" on public.user_group_memberships for insert to authenticated
with
  check (
    exists (
      select
        1
      from
        public.user_groups ug
      where
        ug.id = public.user_group_memberships.user_group_id and
        public.util__is_settings_admin (
          ug.workspace_id
        )
    )
  );

create policy "Settings admins can DELETE user_group_memberships" on public.user_group_memberships for delete to authenticated using (
  exists (
    select
      1
    from
      public.user_groups ug
    where
      ug.id = public.user_group_memberships.user_group_id and
      public.util__is_settings_admin (
        ug.workspace_id
      )
  )
);

------------------------------
-- Policies: resource_user_group_tags
------------------------------
create policy "Members can SELECT resource_user_group_tags" on public.resource_user_group_tags for
select
  to authenticated using (
    public.resource_user_group_tags.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  );

create policy "Settings admins can INSERT resource_user_group_tags" on public.resource_user_group_tags for insert to authenticated
with
  check (
    public.util__is_settings_admin (
      public.resource_user_group_tags.workspace_id
    )
  );

create policy "Settings admins can UPDATE resource_user_group_tags" on public.resource_user_group_tags
for update
  to authenticated using (
    public.util__is_settings_admin (
      public.resource_user_group_tags.workspace_id
    )
  )
with
  check (
    public.util__is_settings_admin (
      public.resource_user_group_tags.workspace_id
    )
  );

create policy "Settings admins can DELETE resource_user_group_tags" on public.resource_user_group_tags for delete to authenticated using (
  public.util__is_settings_admin (
    public.resource_user_group_tags.workspace_id
  )
);

------------------------------
-- Policies: resource_shares
------------------------------
create policy "Members can SELECT resource_shares in their workspaces" on public.resource_shares for
select
  to authenticated using (
    public.resource_shares.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  );

create policy "Settings admins can INSERT resource_shares" on public.resource_shares for insert to authenticated
with
  check (
    public.util__is_settings_admin (
      public.resource_shares.workspace_id
    )
  );

create policy "Settings admins can UPDATE resource_shares" on public.resource_shares
for update
  to authenticated using (
    public.util__is_settings_admin (
      public.resource_shares.workspace_id
    )
  )
with
  check (
    public.util__is_settings_admin (
      public.resource_shares.workspace_id
    )
  );

create policy "Settings admins can DELETE resource_shares" on public.resource_shares for delete to authenticated using (
  public.util__is_settings_admin (
    public.resource_shares.workspace_id
  )
);
