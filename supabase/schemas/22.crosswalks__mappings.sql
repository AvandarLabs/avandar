/**
 * How one column of a crosswalk's combined dataset is filled for one
 * layout: from a source column (optionally converted, or translated
 * through a code list), a fixed value, a Combine expression, or left
 * empty. `fill` is a versioned object the browser parses (version 1:
 * `{ version, kind, ... }`). Select-only for signed-in users; written by
 * `rpc_crosswalks__save`.
 */
create table public.crosswalks__mappings (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Workspace this mapping belongs to, always its crosswalk's
  workspace_id uuid not null,
  -- Crosswalk this mapping belongs to
  crosswalk_id uuid not null,
  -- Timestamp of when the mapping was created
  created_at timestamptz not null default now(),
  -- Timestamp of when the mapping was last updated
  updated_at timestamptz not null default now(),
  -- The layout whose datasets this fill reads
  layout_id uuid not null,
  -- The combined dataset's column this fill writes
  column_id uuid not null,
  -- How the column is filled, as a versioned object
  fill jsonb not null,
  -- Whether the fill is a guess or the user's choice
  status public.crosswalks__mapping_status not null default 'suggested',
  -- How sure matching was, from 0 to 1. Null for a fill the user chose.
  confidence numeric,
  -- Why matching suggested this fill. Null for a fill the user chose.
  reason public.crosswalks__mapping_reason,
  unique (layout_id, column_id),
  foreign key (crosswalk_id, workspace_id) references public.crosswalks (id, workspace_id) on update cascade on delete cascade,
  -- The composite keys keep the layout and the column in this crosswalk.
  foreign key (layout_id, crosswalk_id) references public.crosswalks__layouts (id, crosswalk_id) on update cascade on delete cascade,
  foreign key (column_id, crosswalk_id) references public.crosswalks__columns (id, crosswalk_id) on update cascade on delete cascade,
  constraint crosswalks__mappings__confidence_range check (
    confidence is null or
    confidence between 0 and 1
  ),
  constraint crosswalks__mappings__fill_is_object check (jsonb_typeof(fill) = 'object')
);

alter table public.crosswalks__mappings enable row level security;

-- Signed-in users read only. Writes go through the save RPC.
grant
select
  on table public.crosswalks__mappings to authenticated;

grant
select
,
  insert,
update,
delete on table public.crosswalks__mappings to service_role;

create policy "Data Sources viewers can select crosswalk mappings" on public.crosswalks__mappings for
select
  to authenticated using (
    public.util__auth_user_meets_min_app_role (
      public.crosswalks__mappings.workspace_id,
      'data_sources'::public.app_type,
      'viewer'::public.role_level
    )
  );

create trigger tr__crosswalks__mappings__set_updated_at before
update on public.crosswalks__mappings for each row
execute function public.util__set_updated_at ();

-- Reading and replacing one crosswalk's mappings, and the crosswalk's
-- cascade, go through this index.
create index idx_crosswalks__mappings__crosswalk_id on public.crosswalks__mappings (crosswalk_id);

-- Deleting a column finds its mappings through this index. The unique
-- `(layout_id, column_id)` constraint already serves deleting a layout.
create index idx_crosswalks__mappings__column_id on public.crosswalks__mappings (column_id);
