-- Gate the workspace-wide Settings-Admin grant on resource_shares INSERT and
-- UPDATE so an admin cannot self-grant a share on a resource private to its
-- owner (which would make it non-private, and therefore readable).
-- See docs/superpowers/specs/2026-08-13-private-resource-permissions-hardening-design.md
-- section 4.1. DELETE is intentionally unchanged: removing a share can only
-- reduce access.

drop policy if exists "Resource admins can insert resource_shares" on public.resource_shares;

create policy "Resource admins can insert resource_shares" on public.resource_shares for insert to authenticated
with
  check (
    (
      public.util__is_settings_admin (
        public.resource_shares.workspace_id
      ) and
      not public.util__is_resource_private_to_owner (
        public.resource_shares.resource_type,
        public.resource_shares.resource_id
      )
    ) or
    public.util__auth_user_can_access_resource (
      public.resource_shares.resource_type,
      public.resource_shares.resource_id,
      'admin'
    )
  );

drop policy if exists "Resource admins can update resource_shares" on public.resource_shares;

create policy "Resource admins can update resource_shares" on public.resource_shares
for update
  to authenticated using (
    (
      public.util__is_settings_admin (
        public.resource_shares.workspace_id
      ) and
      not public.util__is_resource_private_to_owner (
        public.resource_shares.resource_type,
        public.resource_shares.resource_id
      )
    ) or
    public.util__auth_user_can_access_resource (
      public.resource_shares.resource_type,
      public.resource_shares.resource_id,
      'admin'
    )
  )
with
  check (
    (
      public.util__is_settings_admin (
        public.resource_shares.workspace_id
      ) and
      not public.util__is_resource_private_to_owner (
        public.resource_shares.resource_type,
        public.resource_shares.resource_id
      )
    ) or
    public.util__auth_user_can_access_resource (
      public.resource_shares.resource_type,
      public.resource_shares.resource_id,
      'admin'
    )
  );
