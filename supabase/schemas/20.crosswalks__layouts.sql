/**
 * One set of column names that one or more of a crosswalk's datasets
 * share. Datasets of one layout are mapped once, together. Exactly one
 * layout of a crosswalk with layouts is the reference, whose columns seed
 * the combined dataset's. Select-only for signed-in users; written by
 * `rpc_crosswalks__save`.
 */
create table public.crosswalks__layouts (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Workspace this layout belongs to, always its crosswalk's
  workspace_id uuid not null,
  -- Crosswalk this layout belongs to
  crosswalk_id uuid not null,
  -- Timestamp of when the layout was created
  created_at timestamptz not null default now(),
  -- Timestamp of when the layout was last updated
  updated_at timestamptz not null default now(),
  -- "l1." and a hash of the lowercased, trimmed, sorted column names. A
  -- dataset joins the layout whose signature its columns give.
  signature text not null,
  -- The column names of the layout's first dataset by name, in its column
  -- order
  column_names text[] not null,
  -- Whether this is the layout the combined dataset's columns come from
  is_reference boolean not null default false,
  -- How far mapping this layout has got
  status public.crosswalks__layout_status not null default 'to_do',
  unique (crosswalk_id, signature),
  -- Lets memberships and mappings use a composite foreign key that keeps
  -- them in this layout's crosswalk.
  unique (id, crosswalk_id),
  foreign key (crosswalk_id, workspace_id) references public.crosswalks (id, workspace_id) on update cascade on delete cascade,
  constraint crosswalks__layouts__reference_is_mapped check (
    not is_reference or
    status = 'mapped'
  ),
  constraint crosswalks__layouts__has_columns check (cardinality(column_names) > 0)
);

alter table public.crosswalks__layouts enable row level security;

-- Signed-in users read only. Writes go through the save RPC.
grant
select
  on table public.crosswalks__layouts to authenticated;

grant
select
,
  insert,
update,
delete on table public.crosswalks__layouts to service_role;

create policy "Data Sources viewers can select crosswalk layouts" on public.crosswalks__layouts for
select
  to authenticated using (
    public.util__auth_user_meets_min_app_role (
      public.crosswalks__layouts.workspace_id,
      'data_sources'::public.app_type,
      'viewer'::public.role_level
    )
  );

create trigger tr__crosswalks__layouts__set_updated_at before
update on public.crosswalks__layouts for each row
execute function public.util__set_updated_at ();

-- At most one reference layout per crosswalk.
create unique index crosswalks__layouts__one_reference on public.crosswalks__layouts (crosswalk_id)
where
  is_reference;
