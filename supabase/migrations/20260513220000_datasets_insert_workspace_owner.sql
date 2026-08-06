-- Second permissive INSERT policy: workspace owners inserting their own
-- dataset rows (see 17.dashboards_datasets_rls.sql).
create policy "Workspace owners can insert datasets" on public.datasets for insert to authenticated
with
  check (
    exists (
      select
        1
      from
        public.workspaces w
      where
        w.id = public.datasets.workspace_id and
        w.owner_id = auth.uid ()
    ) and
    public.datasets.owner_id = (
      select
        auth.uid ()
    )
  );
