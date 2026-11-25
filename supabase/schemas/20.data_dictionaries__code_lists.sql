/**
 * An ordered list of code pairs in a dictionary, such as `1 = Male`. Pairs
 * work both ways: coded data decodes to labels, and labelled data encodes
 * to codes. Select-only for signed-in users; written by
 * `rpc_data_dictionaries__save`.
 */
create table public.data_dictionaries__code_lists (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Workspace this code list belongs to, always its dictionary's
  workspace_id uuid not null,
  -- Dictionary this code list belongs to
  dictionary_id uuid not null,
  -- Timestamp of when the code list was created
  created_at timestamptz not null default now(),
  -- Timestamp of when the code list was last updated
  updated_at timestamptz not null default now(),
  -- Name of the code list, such as "Sex (1/2/9)"
  name text not null,
  -- Whether the pairs are levels of a scale, kept in order in charts
  is_ordered boolean not null default false,
  -- The pairs in display order, as
  -- `[{ code, label, accepted_spellings, is_missing }]`. Parsed by
  -- `DataDictionaryCodeListParsers`.
  pairs jsonb not null default '[]'::jsonb,
  -- Lets codings check that a code list and an entry share a dictionary.
  unique (id, dictionary_id),
  foreign key (dictionary_id, workspace_id) references public.data_dictionaries (id, workspace_id) on update cascade on delete cascade,
  constraint data_dictionaries__code_lists__pairs_is_array check (jsonb_typeof(pairs) = 'array')
);

alter table public.data_dictionaries__code_lists enable row level security;

-- Signed-in users read only. Writes go through the save RPC.
grant
select
  on table public.data_dictionaries__code_lists to authenticated;

grant
select
,
  insert,
update,
delete on table public.data_dictionaries__code_lists to service_role;

create policy "Data Sources viewers can select dictionary code lists" on public.data_dictionaries__code_lists for
select
  to authenticated using (
    public.util__auth_user_meets_min_app_role (
      public.data_dictionaries__code_lists.workspace_id,
      'data_sources'::public.app_type,
      'viewer'::public.role_level
    )
  );

create trigger tr__data_dictionaries__code_lists__set_updated_at before
update on public.data_dictionaries__code_lists for each row
execute function public.util__set_updated_at ();

create index idx_data_dictionaries__code_lists__dictionary_id on public.data_dictionaries__code_lists (dictionary_id);
