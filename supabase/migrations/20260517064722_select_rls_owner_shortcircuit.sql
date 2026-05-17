-- Short-circuit the dashboards/datasets SELECT RLS for the row owner.
--
-- The existing `util__auth_user_may_select_*` helpers are STABLE SECURITY
-- DEFINER functions that re-fetch the row from the same table inside their
-- body. During `INSERT ... RETURNING`, that inner SELECT cannot see the
-- just-inserted row, so the helper returns false and the RETURNING clause
-- fails with a "new row violates row-level security policy" error -- even for
-- the row's own owner.
--
-- The fix adds an inline `owner_id = auth.uid()` predicate to the SELECT USING
-- clause. Owners pass without entering the helper at all, which keeps
-- `INSERT ... RETURNING *` working for the inserting user. Non-owner reads
-- still go through the helper unchanged.

drop policy if exists "Users can read dashboards they have permissions for"
  on public.dashboards;

create policy "Users can read dashboards they have permissions for"
  on public.dashboards
  for select
  to authenticated
  using (
    public.dashboards.owner_id = (select auth.uid()) or
    public.util__auth_user_may_select_dashboard (public.dashboards.id)
  );

drop policy if exists "User can select datasets they have permissions for"
  on public.datasets;

create policy "User can select datasets they have permissions for"
  on public.datasets
  for select
  to authenticated
  using (
    public.datasets.owner_id = (select auth.uid()) or
    public.util__auth_user_may_select_dataset (public.datasets.id)
  );
