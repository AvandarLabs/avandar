-- Widen usage_analytics_events SELECT from workspace-owner-only to any
-- workspace manager, so a Settings Admin who is not the workspace owner can
-- read the resource.ownership_transferred audit trail they generate. See
-- docs/superpowers/specs/2026-08-13-private-resource-permissions-hardening-design.md
-- section 5.3.

drop policy if exists "
  Workspace owners can SELECT analytics events for their workspaces
" on public.usage_analytics_events;

create policy "
  Workspace managers can SELECT analytics events for their workspaces
" on public.usage_analytics_events for
select
  to authenticated using (
    workspace_id is not null and
    public.util__can_manage_workspace_settings (
      public.usage_analytics_events.workspace_id
    )
  );
