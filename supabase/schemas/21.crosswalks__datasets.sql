/**
 * One dataset's membership in a crosswalk: which layout it belongs to. A
 * dataset joins the layout whose signature its columns give. Visible only
 * to Data Sources viewers who can also view the dataset, so a reader never
 * learns about a dataset they cannot open. Select-only for signed-in
 * users; written by `rpc_crosswalks__save`, which never removes a
 * membership whose dataset the caller cannot view.
 */
create table public.crosswalks__datasets (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Workspace this membership belongs to, always its crosswalk's
  workspace_id uuid not null,
  -- Crosswalk the dataset belongs to
  crosswalk_id uuid not null,
  -- Timestamp of when the dataset joined the crosswalk
  created_at timestamptz not null default now(),
  -- The dataset. Leaves every crosswalk when it is deleted.
  dataset_id uuid not null references public.datasets (id) on update cascade on delete cascade,
  -- The layout the dataset belongs to, in the same crosswalk
  layout_id uuid not null,
  unique (crosswalk_id, dataset_id),
  foreign key (crosswalk_id, workspace_id) references public.crosswalks (id, workspace_id) on update cascade on delete cascade,
  foreign key (layout_id, crosswalk_id) references public.crosswalks__layouts (id, crosswalk_id) on update cascade on delete cascade
);

alter table public.crosswalks__datasets enable row level security;

-- Signed-in users read only. Writes go through the save RPC.
grant
select
  on table public.crosswalks__datasets to authenticated;

grant
select
,
  insert,
update,
delete on table public.crosswalks__datasets to service_role;

-- Memberships follow their dataset as well as the crosswalk: a reader who
-- cannot view a dataset never sees that a crosswalk includes it.
create policy "Dataset viewers can select their crosswalk memberships" on public.crosswalks__datasets for
select
  to authenticated using (
    public.util__auth_user_meets_min_app_role (
      public.crosswalks__datasets.workspace_id,
      'data_sources'::public.app_type,
      'viewer'::public.role_level
    ) and
    public.util__auth_user_can_access_resource (
      'dataset'::public.resource_type,
      public.crosswalks__datasets.dataset_id,
      'viewer'::public.role_level
    )
  );

-- Deleting a dataset, and a combined dataset's staleness lookups, find its
-- memberships through this index.
create index idx_crosswalks__datasets__dataset_id on public.crosswalks__datasets (dataset_id);

-- Deleting a layout finds its memberships through this index.
create index idx_crosswalks__datasets__layout_id on public.crosswalks__datasets (layout_id);
