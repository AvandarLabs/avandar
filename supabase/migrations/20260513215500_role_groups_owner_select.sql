-- Allow workspace owners to read built-in role_groups before their first
-- membership row exists (required by rpc_workspaces__create_with_owner).
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
