/**
 * One kind of column a dictionary describes: its name, the other column
 * names it matches, its kind, and its description. Select-only for
 * signed-in users; written by `rpc_data_dictionaries__save`.
 */
create table public.data_dictionaries__entries (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Workspace this entry belongs to, always its dictionary's
  workspace_id uuid not null,
  -- Dictionary this entry belongs to
  dictionary_id uuid not null,
  -- Timestamp of when the entry was created
  created_at timestamptz not null default now(),
  -- Timestamp of when the entry was last updated
  updated_at timestamptz not null default now(),
  -- The entry's name, unique per dictionary ignoring case
  name text not null,
  -- The other column names this entry matches, such as GENDER
  column_names text[] not null default '{}',
  -- What kind of column this is
  kind public.data_dictionaries__entry_kind not null,
  -- Unit of a number entry, such as "years"
  unit text,
  -- Lowest valid value of a number entry
  valid_min numeric,
  -- Highest valid value of a number entry
  valid_max numeric,
  -- What the column means
  description text,
  -- Display order within the dictionary, ascending
  position integer not null,
  -- Lets codings check that an entry and a code list share a dictionary.
  unique (id, dictionary_id),
  foreign key (dictionary_id, workspace_id) references public.data_dictionaries (id, workspace_id) on update cascade on delete cascade,
  constraint data_dictionaries__entries__valid_range check (
    valid_min is null or
    valid_max is null or
    valid_min <= valid_max
  )
);

alter table public.data_dictionaries__entries enable row level security;

-- Signed-in users read only. Writes go through the save RPC.
grant
select
  on table public.data_dictionaries__entries to authenticated;

grant
select
,
  insert,
update,
delete on table public.data_dictionaries__entries to service_role;

create policy "Data Sources viewers can select dictionary entries" on public.data_dictionaries__entries for
select
  to authenticated using (
    public.util__auth_user_meets_min_app_role (
      public.data_dictionaries__entries.workspace_id,
      'data_sources'::public.app_type,
      'viewer'::public.role_level
    )
  );

create trigger tr__data_dictionaries__entries__set_updated_at before
update on public.data_dictionaries__entries for each row
execute function public.util__set_updated_at ();

create unique index data_dictionaries__entries__name_unique on public.data_dictionaries__entries (dictionary_id, lower(name));
