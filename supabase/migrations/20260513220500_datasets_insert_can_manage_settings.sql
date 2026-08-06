-- Aligns INSERT with the same privilege gate used inside
-- rpc_datasets__add_dataset (owner or Settings admin).
create policy "Workspace settings managers can insert datasets" on public.datasets for insert to authenticated
with
  check (
    public.util__can_manage_workspace_settings (
      public.datasets.workspace_id
    ) and
    public.datasets.owner_id = (
      select
        auth.uid ()
    )
  );
