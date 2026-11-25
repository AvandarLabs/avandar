/**
 * Which code lists an entry recognizes. One `sex` entry can recognize both
 * `1/2/9` and `M/F/U`; the primary coding's labels are the entry's
 * canonical labels. Select-only for signed-in users; written by
 * `rpc_data_dictionaries__save`.
 */
create table public.data_dictionaries__entry_codings (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Workspace this coding belongs to, always its dictionary's
  workspace_id uuid not null,
  -- Dictionary the entry and the code list both belong to
  dictionary_id uuid not null,
  -- The entry
  entry_id uuid not null,
  -- The code list the entry recognizes
  code_list_id uuid not null,
  -- Whether this is the entry's canonical coding
  is_primary boolean not null default false,
  -- Timestamp of when the coding was created
  created_at timestamptz not null default now(),
  -- Timestamp of when the coding was last updated
  updated_at timestamptz not null default now(),
  unique (entry_id, code_list_id),
  foreign key (dictionary_id, workspace_id) references public.data_dictionaries (id, workspace_id) on update cascade on delete cascade,
  -- The composite keys keep the entry and the code list in this dictionary.
  foreign key (entry_id, dictionary_id) references public.data_dictionaries__entries (id, dictionary_id) on update cascade on delete cascade,
  foreign key (code_list_id, dictionary_id) references public.data_dictionaries__code_lists (id, dictionary_id) on update cascade on delete cascade
);

alter table public.data_dictionaries__entry_codings enable row level security;

-- Signed-in users read only. Writes go through the save RPC.
grant
select
  on table public.data_dictionaries__entry_codings to authenticated;

grant
select
,
  insert,
update,
delete on table public.data_dictionaries__entry_codings to service_role;

create policy "Data Sources viewers can select dictionary entry codings" on public.data_dictionaries__entry_codings for
select
  to authenticated using (
    public.util__auth_user_meets_min_app_role (
      public.data_dictionaries__entry_codings.workspace_id,
      'data_sources'::public.app_type,
      'viewer'::public.role_level
    )
  );

create trigger tr__data_dictionaries__entry_codings__set_updated_at before
update on public.data_dictionaries__entry_codings for each row
execute function public.util__set_updated_at ();

-- At most one primary coding per entry.
create unique index data_dictionaries__entry_codings__one_primary on public.data_dictionaries__entry_codings (entry_id)
where
  is_primary;

create index idx_data_dictionaries__entry_codings__dictionary_id on public.data_dictionaries__entry_codings (dictionary_id);

create index idx_data_dictionaries__entry_codings__code_list_id on public.data_dictionaries__entry_codings (code_list_id);
