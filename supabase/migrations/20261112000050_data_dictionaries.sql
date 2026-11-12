create type "public"."data_dictionaries__entry_kind" as enum ('categorical', 'ordered', 'number', 'date', 'text', 'identifier');

  create table "public"."data_dictionaries" (
    "id" uuid not null default gen_random_uuid(),
    "workspace_id" uuid not null,
    "owner_id" uuid not null default auth.uid(),
    "owner_profile_id" uuid not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "name" text not null,
    "description" text,
    "version" integer not null default 1,
    "created_from_dataset_ids" uuid[] not null default '{}'::uuid[]
      );


alter table "public"."data_dictionaries" enable row level security;


  create table "public"."data_dictionaries__code_lists" (
    "id" uuid not null default gen_random_uuid(),
    "workspace_id" uuid not null,
    "dictionary_id" uuid not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "name" text not null,
    "is_ordered" boolean not null default false,
    "pairs" jsonb not null default '[]'::jsonb
      );


alter table "public"."data_dictionaries__code_lists" enable row level security;


  create table "public"."data_dictionaries__entries" (
    "id" uuid not null default gen_random_uuid(),
    "workspace_id" uuid not null,
    "dictionary_id" uuid not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "name" text not null,
    "column_names" text[] not null default '{}'::text[],
    "kind" public.data_dictionaries__entry_kind not null,
    "unit" text,
    "valid_min" numeric,
    "valid_max" numeric,
    "description" text,
    "position" integer not null
      );


alter table "public"."data_dictionaries__entries" enable row level security;


  create table "public"."data_dictionaries__entry_codings" (
    "id" uuid not null default gen_random_uuid(),
    "workspace_id" uuid not null,
    "dictionary_id" uuid not null,
    "entry_id" uuid not null,
    "code_list_id" uuid not null,
    "is_primary" boolean not null default false,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."data_dictionaries__entry_codings" enable row level security;

CREATE UNIQUE INDEX data_dictionaries__code_lists_id_dictionary_id_key ON public.data_dictionaries__code_lists USING btree (id, dictionary_id);

CREATE UNIQUE INDEX data_dictionaries__code_lists_pkey ON public.data_dictionaries__code_lists USING btree (id);

CREATE UNIQUE INDEX data_dictionaries__entries__name_unique ON public.data_dictionaries__entries USING btree (dictionary_id, lower(name));

CREATE UNIQUE INDEX data_dictionaries__entries_id_dictionary_id_key ON public.data_dictionaries__entries USING btree (id, dictionary_id);

CREATE UNIQUE INDEX data_dictionaries__entries_pkey ON public.data_dictionaries__entries USING btree (id);

CREATE UNIQUE INDEX data_dictionaries__entry_codings__one_primary ON public.data_dictionaries__entry_codings USING btree (entry_id) WHERE is_primary;

CREATE UNIQUE INDEX data_dictionaries__entry_codings_entry_id_code_list_id_key ON public.data_dictionaries__entry_codings USING btree (entry_id, code_list_id);

CREATE UNIQUE INDEX data_dictionaries__entry_codings_pkey ON public.data_dictionaries__entry_codings USING btree (id);

CREATE UNIQUE INDEX data_dictionaries_id_workspace_id_key ON public.data_dictionaries USING btree (id, workspace_id);

CREATE UNIQUE INDEX data_dictionaries_pkey ON public.data_dictionaries USING btree (id);

CREATE INDEX idx_data_dictionaries__code_lists__dictionary_id ON public.data_dictionaries__code_lists USING btree (dictionary_id);

CREATE INDEX idx_data_dictionaries__entry_codings__code_list_id ON public.data_dictionaries__entry_codings USING btree (code_list_id);

CREATE INDEX idx_data_dictionaries__entry_codings__dictionary_id ON public.data_dictionaries__entry_codings USING btree (dictionary_id);

CREATE INDEX idx_data_dictionaries__owner_profile_id ON public.data_dictionaries USING btree (owner_profile_id);

CREATE INDEX idx_data_dictionaries__workspace_owner ON public.data_dictionaries USING btree (workspace_id, owner_id);

alter table "public"."data_dictionaries" add constraint "data_dictionaries_pkey" PRIMARY KEY using index "data_dictionaries_pkey";

alter table "public"."data_dictionaries__code_lists" add constraint "data_dictionaries__code_lists_pkey" PRIMARY KEY using index "data_dictionaries__code_lists_pkey";

alter table "public"."data_dictionaries__entries" add constraint "data_dictionaries__entries_pkey" PRIMARY KEY using index "data_dictionaries__entries_pkey";

alter table "public"."data_dictionaries__entry_codings" add constraint "data_dictionaries__entry_codings_pkey" PRIMARY KEY using index "data_dictionaries__entry_codings_pkey";

alter table "public"."data_dictionaries" add constraint "data_dictionaries__name_not_blank" CHECK ((btrim(name) <> ''::text)) not valid;

alter table "public"."data_dictionaries" validate constraint "data_dictionaries__name_not_blank";

alter table "public"."data_dictionaries" add constraint "data_dictionaries_id_workspace_id_key" UNIQUE using index "data_dictionaries_id_workspace_id_key";

alter table "public"."data_dictionaries" add constraint "data_dictionaries_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON UPDATE CASCADE not valid;

alter table "public"."data_dictionaries" validate constraint "data_dictionaries_owner_id_fkey";

alter table "public"."data_dictionaries" add constraint "data_dictionaries_owner_profile_id_fkey" FOREIGN KEY (owner_profile_id) REFERENCES public.user_profiles(id) ON UPDATE CASCADE not valid;

alter table "public"."data_dictionaries" validate constraint "data_dictionaries_owner_profile_id_fkey";

alter table "public"."data_dictionaries" add constraint "data_dictionaries_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."data_dictionaries" validate constraint "data_dictionaries_workspace_id_fkey";

alter table "public"."data_dictionaries__code_lists" add constraint "data_dictionaries__code_lists__pairs_is_array" CHECK ((jsonb_typeof(pairs) = 'array'::text)) not valid;

alter table "public"."data_dictionaries__code_lists" validate constraint "data_dictionaries__code_lists__pairs_is_array";

alter table "public"."data_dictionaries__code_lists" add constraint "data_dictionaries__code_lists_dictionary_id_workspace_id_fkey" FOREIGN KEY (dictionary_id, workspace_id) REFERENCES public.data_dictionaries(id, workspace_id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."data_dictionaries__code_lists" validate constraint "data_dictionaries__code_lists_dictionary_id_workspace_id_fkey";

alter table "public"."data_dictionaries__code_lists" add constraint "data_dictionaries__code_lists_id_dictionary_id_key" UNIQUE using index "data_dictionaries__code_lists_id_dictionary_id_key";

alter table "public"."data_dictionaries__entries" add constraint "data_dictionaries__entries__valid_range" CHECK (((valid_min IS NULL) OR (valid_max IS NULL) OR (valid_min <= valid_max))) not valid;

alter table "public"."data_dictionaries__entries" validate constraint "data_dictionaries__entries__valid_range";

alter table "public"."data_dictionaries__entries" add constraint "data_dictionaries__entries_dictionary_id_workspace_id_fkey" FOREIGN KEY (dictionary_id, workspace_id) REFERENCES public.data_dictionaries(id, workspace_id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."data_dictionaries__entries" validate constraint "data_dictionaries__entries_dictionary_id_workspace_id_fkey";

alter table "public"."data_dictionaries__entries" add constraint "data_dictionaries__entries_id_dictionary_id_key" UNIQUE using index "data_dictionaries__entries_id_dictionary_id_key";

alter table "public"."data_dictionaries__entry_codings" add constraint "data_dictionaries__entry_coding_code_list_id_dictionary_id_fkey" FOREIGN KEY (code_list_id, dictionary_id) REFERENCES public.data_dictionaries__code_lists(id, dictionary_id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."data_dictionaries__entry_codings" validate constraint "data_dictionaries__entry_coding_code_list_id_dictionary_id_fkey";

alter table "public"."data_dictionaries__entry_codings" add constraint "data_dictionaries__entry_coding_dictionary_id_workspace_id_fkey" FOREIGN KEY (dictionary_id, workspace_id) REFERENCES public.data_dictionaries(id, workspace_id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."data_dictionaries__entry_codings" validate constraint "data_dictionaries__entry_coding_dictionary_id_workspace_id_fkey";

alter table "public"."data_dictionaries__entry_codings" add constraint "data_dictionaries__entry_codings_entry_id_code_list_id_key" UNIQUE using index "data_dictionaries__entry_codings_entry_id_code_list_id_key";

alter table "public"."data_dictionaries__entry_codings" add constraint "data_dictionaries__entry_codings_entry_id_dictionary_id_fkey" FOREIGN KEY (entry_id, dictionary_id) REFERENCES public.data_dictionaries__entries(id, dictionary_id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."data_dictionaries__entry_codings" validate constraint "data_dictionaries__entry_codings_entry_id_dictionary_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.data_dictionaries__check_code_lists(p_dictionary_id uuid, p_code_lists jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if jsonb_typeof(p_code_lists) is distinct from 'array' or exists (
    select 1
    from jsonb_array_elements(p_code_lists) as l (list)
    where jsonb_typeof(l.list -> 'pairs') is distinct from 'array'
  ) then
    raise exception 'Code lists must be an array of lists with pairs'
      using errcode = '22023', hint = 'dictionary_payload_invalid';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_code_lists) as l (id uuid)
    group by l.id
    having count(*) > 1
  ) then
    raise exception 'A code list id appears more than once'
      using errcode = '22023', hint = 'dictionary_payload_invalid';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_code_lists) as l (id uuid)
    left join public.data_dictionaries__code_lists cl on cl.id = l.id
    where l.id is null or cl.dictionary_id <> p_dictionary_id
  ) then
    raise exception 'Every code list must be new or belong to this dictionary'
      using errcode = '23514', hint = 'item_not_in_dictionary';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_code_lists) as l (name text)
    where coalesce(btrim(l.name), '') = ''
  ) then
    raise exception 'Every code list needs a name'
      using errcode = '23514', hint = 'code_list_name_required';
  end if;

  perform public.data_dictionaries__check_pairs (p_code_lists);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.data_dictionaries__check_codings(p_entries jsonb, p_code_lists jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if exists (
    select 1
    from jsonb_array_elements(p_entries) as e (entry)
    where
      jsonb_array_length(coalesce(e.entry -> 'codings', '[]'::jsonb)) > 0 and
      e.entry ->> 'kind' not in ('categorical', 'ordered')
  ) then
    raise exception 'Only categorical and ordered entries have code lists'
      using errcode = '23514', hint = 'coding_kind_mismatch';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_entries) with ordinality as e (entry, entry_index)
    cross join lateral jsonb_to_recordset(coalesce(e.entry -> 'codings', '[]'::jsonb)) as c (code_list_id uuid)
    group by e.entry_index, c.code_list_id
    having count(*) > 1
  ) then
    raise exception 'An entry lists the same code list more than once'
      using errcode = '22023', hint = 'dictionary_payload_invalid';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_entries) as e (entry)
    cross join lateral jsonb_to_recordset(coalesce(e.entry -> 'codings', '[]'::jsonb)) as c (code_list_id uuid)
    where not exists (
      select 1
      from jsonb_to_recordset(p_code_lists) as l (id uuid)
      where l.id = c.code_list_id
    )
  ) then
    raise exception 'A code list an entry uses must be saved with it'
      using errcode = '23514', hint = 'coding_list_not_in_dictionary';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_entries) as e (entry)
    where
      jsonb_array_length(coalesce(e.entry -> 'codings', '[]'::jsonb)) > 0 and
      (
        select count(*)
        from jsonb_to_recordset(e.entry -> 'codings') as c (is_primary boolean)
        where c.is_primary
      ) <> 1
  ) then
    raise exception 'An entry with code lists needs exactly one primary list'
      using errcode = '23514', hint = 'coding_primary_required';
  end if;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.data_dictionaries__check_entries(p_dictionary_id uuid, p_entries jsonb, p_code_lists jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if jsonb_typeof(p_entries) is distinct from 'array' or exists (
    select 1
    from jsonb_to_recordset(p_entries) as e (kind text)
    where e.kind is null or e.kind not in (
      select unnest(enum_range(null::public.data_dictionaries__entry_kind))::text
    )
  ) then
    raise exception 'Entries must be an array with a known kind each'
      using errcode = '22023', hint = 'dictionary_payload_invalid';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_entries) as e (id uuid)
    group by e.id
    having count(*) > 1
  ) then
    raise exception 'An entry id appears more than once'
      using errcode = '22023', hint = 'dictionary_payload_invalid';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_entries) as e (id uuid)
    left join public.data_dictionaries__entries en on en.id = e.id
    where e.id is null or en.dictionary_id <> p_dictionary_id
  ) then
    raise exception 'Every entry must be new or belong to this dictionary'
      using errcode = '23514', hint = 'item_not_in_dictionary';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_entries) as e (name text)
    where coalesce(btrim(e.name), '') = ''
  ) then
    raise exception 'Every entry needs a name'
      using errcode = '23514', hint = 'entry_name_required';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_entries) as e (name text)
    group by lower(btrim(e.name))
    having count(*) > 1
  ) then
    raise exception 'Two entries in one dictionary cannot share a name'
      using errcode = '23505', hint = 'entry_names_not_unique';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_entries) as e (valid_min numeric, valid_max numeric)
    where e.valid_min > e.valid_max
  ) then
    raise exception 'The lowest valid value cannot be above the highest'
      using errcode = '23514', hint = 'entry_range_invalid';
  end if;

  perform public.data_dictionaries__check_codings (p_entries, p_code_lists);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.data_dictionaries__check_pairs(p_code_lists jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if exists (
    select 1
    from jsonb_array_elements(p_code_lists) as l (list)
    cross join lateral jsonb_array_elements(l.list -> 'pairs') as p (pair)
    where
      coalesce(btrim(p.pair ->> 'code'), '') = '' or
      coalesce(btrim(p.pair ->> 'label'), '') = ''
  ) then
    raise exception 'Every value needs a code and a label'
      using errcode = '23514', hint = 'code_pair_incomplete';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_code_lists) with ordinality as l (list, list_index)
    cross join lateral jsonb_array_elements(l.list -> 'pairs') as p (pair)
    group by l.list_index, lower(btrim(p.pair ->> 'code'))
    having count(*) > 1
  ) then
    raise exception 'Two codes in one list only differ in capitalization or spaces'
      using errcode = '23514', hint = 'codes_not_unique';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_code_lists) with ordinality as l (list, list_index)
    cross join lateral jsonb_array_elements(l.list -> 'pairs') with ordinality as p (pair, pair_index)
    cross join lateral (
      select p.pair ->> 'label' as spelling
      union all
      select s.spelling
      from jsonb_array_elements_text(coalesce(p.pair -> 'accepted_spellings', '[]'::jsonb)) as s (spelling)
    ) as spellings
    where btrim(spellings.spelling) <> ''
    group by l.list_index, lower(btrim(spellings.spelling))
    having count(distinct p.pair_index) > 1
  ) then
    raise exception 'Two values in one list share a label or an accepted spelling'
      using errcode = '23514', hint = 'labels_not_unique';
  end if;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.data_dictionaries__guard_managed_columns()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if current_user <> 'authenticated' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.version <> 1 then
      raise exception 'a new dictionary starts at version 1'
        using errcode = '42501';
    end if;
  elsif
    new.version is distinct from old.version or
    new.owner_id is distinct from old.owner_id or
    new.owner_profile_id is distinct from old.owner_profile_id or
    new.created_from_dataset_ids is distinct from old.created_from_dataset_ids
  then
    raise exception 'a dictionary''s version, owner, and sources are managed'
      using errcode = '42501';
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.data_dictionaries__prevent_workspace_id_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if new.workspace_id is distinct from old.workspace_id then
    raise exception 'dictionary workspace_id cannot be changed'
      using errcode = '23514';
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.data_dictionaries__validate_owner_profile()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not exists (
    select 1
    from public.user_profiles up
    where
      up.id = new.owner_profile_id and
      up.user_id = new.owner_id and
      up.workspace_id = new.workspace_id
  ) then
    raise exception 'dictionary owner profile must match owner and workspace'
      using errcode = '23514';
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.data_dictionaries__write_code_lists(p_dictionary_id uuid, p_workspace_id uuid, p_code_lists jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  insert into public.data_dictionaries__code_lists (id, workspace_id, dictionary_id, name, is_ordered, pairs)
  select l.id, p_workspace_id, p_dictionary_id, btrim(l.name), coalesce(l.is_ordered, false), l.pairs
  from jsonb_to_recordset(p_code_lists) as l (id uuid, name text, is_ordered boolean, pairs jsonb)
  on conflict (id) do update
  set
    name = excluded.name,
    is_ordered = excluded.is_ordered,
    pairs = excluded.pairs
  where public.data_dictionaries__code_lists.dictionary_id = excluded.dictionary_id;

  delete from public.data_dictionaries__code_lists cl
  where
    cl.dictionary_id = p_dictionary_id and
    not exists (
      select 1
      from jsonb_to_recordset(p_code_lists) as l (id uuid)
      where l.id = cl.id
    );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.data_dictionaries__write_entries(p_dictionary_id uuid, p_workspace_id uuid, p_entries jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  -- Park saved names under a unique placeholder first, so a save that swaps
  -- two names never meets the unique name index partway through.
  update public.data_dictionaries__entries en
  set name = '~' || en.id::text
  where en.dictionary_id = p_dictionary_id;

  insert into public.data_dictionaries__entries (
    id, workspace_id, dictionary_id, name, column_names, kind, unit, valid_min, valid_max, description, position
  )
  select
    e.id, p_workspace_id, p_dictionary_id, btrim(e.name), coalesce(e.column_names, '{}'),
    e.kind::public.data_dictionaries__entry_kind, nullif(btrim(e.unit), ''), e.valid_min, e.valid_max,
    nullif(btrim(e.description), ''), e.position
  from jsonb_to_recordset(p_entries) as e (
    id uuid, name text, column_names text[], kind text, unit text,
    valid_min numeric, valid_max numeric, description text, position integer
  )
  on conflict (id) do update
  set
    name = excluded.name,
    column_names = excluded.column_names,
    kind = excluded.kind,
    unit = excluded.unit,
    valid_min = excluded.valid_min,
    valid_max = excluded.valid_max,
    description = excluded.description,
    position = excluded.position
  where public.data_dictionaries__entries.dictionary_id = excluded.dictionary_id;

  delete from public.data_dictionaries__entries en
  where
    en.dictionary_id = p_dictionary_id and
    not exists (
      select 1
      from jsonb_to_recordset(p_entries) as e (id uuid)
      where e.id = en.id
    );

  insert into public.data_dictionaries__entry_codings (workspace_id, dictionary_id, entry_id, code_list_id, is_primary)
  select p_workspace_id, p_dictionary_id, (e.entry ->> 'id')::uuid, c.code_list_id, coalesce(c.is_primary, false)
  from jsonb_array_elements(p_entries) as e (entry)
  cross join lateral jsonb_to_recordset(coalesce(e.entry -> 'codings', '[]'::jsonb)) as c (code_list_id uuid, is_primary boolean);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_data_dictionaries__save(p_dictionary_id uuid, p_code_lists jsonb, p_entries jsonb)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_workspace_id uuid;
  v_code_lists jsonb := coalesce(p_code_lists, '[]'::jsonb);
  v_entries jsonb := coalesce(p_entries, '[]'::jsonb);
  v_version integer;
begin
  -- Read without a lock: the caller has not been authorized yet.
  select d.workspace_id
  into v_workspace_id
  from public.data_dictionaries d
  where d.id = p_dictionary_id;

  -- A missing dictionary and a forbidden one raise the same error, so the
  -- function cannot be used to probe for dictionary ids.
  if v_workspace_id is null or not public.util__auth_user_meets_min_app_role (
    v_workspace_id,
    'data_sources'::public.app_type,
    'editor'::public.role_level
  ) then
    raise exception 'Only Data Sources editors can change a dictionary'
      using errcode = '42501', hint = 'dictionary_editor_required';
  end if;

  -- Two saves of one dictionary run one at a time.
  perform 1 from public.data_dictionaries where id = p_dictionary_id for update;

  perform public.data_dictionaries__check_code_lists (p_dictionary_id, v_code_lists);
  perform public.data_dictionaries__check_entries (p_dictionary_id, v_entries, v_code_lists);

  delete from public.data_dictionaries__entry_codings ec
  where ec.dictionary_id = p_dictionary_id;

  perform public.data_dictionaries__write_code_lists (p_dictionary_id, v_workspace_id, v_code_lists);
  perform public.data_dictionaries__write_entries (p_dictionary_id, v_workspace_id, v_entries);

  update public.data_dictionaries
  set version = version + 1
  where id = p_dictionary_id
  returning version into v_version;

  return v_version;
end;
$function$
;

grant delete on table "public"."data_dictionaries" to "authenticated";

grant insert on table "public"."data_dictionaries" to "authenticated";

grant select on table "public"."data_dictionaries" to "authenticated";

grant update on table "public"."data_dictionaries" to "authenticated";

grant delete on table "public"."data_dictionaries" to "service_role";

grant insert on table "public"."data_dictionaries" to "service_role";

grant select on table "public"."data_dictionaries" to "service_role";

grant update on table "public"."data_dictionaries" to "service_role";

grant select on table "public"."data_dictionaries__code_lists" to "authenticated";

grant delete on table "public"."data_dictionaries__code_lists" to "service_role";

grant insert on table "public"."data_dictionaries__code_lists" to "service_role";

grant select on table "public"."data_dictionaries__code_lists" to "service_role";

grant update on table "public"."data_dictionaries__code_lists" to "service_role";

grant select on table "public"."data_dictionaries__entries" to "authenticated";

grant delete on table "public"."data_dictionaries__entries" to "service_role";

grant insert on table "public"."data_dictionaries__entries" to "service_role";

grant select on table "public"."data_dictionaries__entries" to "service_role";

grant update on table "public"."data_dictionaries__entries" to "service_role";

grant select on table "public"."data_dictionaries__entry_codings" to "authenticated";

grant delete on table "public"."data_dictionaries__entry_codings" to "service_role";

grant insert on table "public"."data_dictionaries__entry_codings" to "service_role";

grant select on table "public"."data_dictionaries__entry_codings" to "service_role";

grant update on table "public"."data_dictionaries__entry_codings" to "service_role";


  create policy "Data Sources editors can insert dictionaries they own"
  on "public"."data_dictionaries"
  as permissive
  for insert
  to authenticated
with check (((owner_id = ( SELECT auth.uid() AS uid)) AND public.util__auth_user_meets_min_app_role(workspace_id, 'data_sources'::public.app_type, 'editor'::public.role_level)));



  create policy "Data Sources editors can update dictionaries"
  on "public"."data_dictionaries"
  as permissive
  for update
  to authenticated
using (public.util__auth_user_meets_min_app_role(workspace_id, 'data_sources'::public.app_type, 'editor'::public.role_level))
with check (public.util__auth_user_meets_min_app_role(workspace_id, 'data_sources'::public.app_type, 'editor'::public.role_level));



  create policy "Data Sources viewers can select dictionaries"
  on "public"."data_dictionaries"
  as permissive
  for select
  to authenticated
using (public.util__auth_user_meets_min_app_role(workspace_id, 'data_sources'::public.app_type, 'viewer'::public.role_level));



  create policy "Owners and Data Sources admins can delete dictionaries"
  on "public"."data_dictionaries"
  as permissive
  for delete
  to authenticated
using ((((owner_id = ( SELECT auth.uid() AS uid)) AND public.util__auth_user_meets_min_app_role(workspace_id, 'data_sources'::public.app_type, 'editor'::public.role_level)) OR public.util__auth_user_meets_min_app_role(workspace_id, 'data_sources'::public.app_type, 'admin'::public.role_level)));



  create policy "Data Sources viewers can select dictionary code lists"
  on "public"."data_dictionaries__code_lists"
  as permissive
  for select
  to authenticated
using (public.util__auth_user_meets_min_app_role(workspace_id, 'data_sources'::public.app_type, 'viewer'::public.role_level));



  create policy "Data Sources viewers can select dictionary entries"
  on "public"."data_dictionaries__entries"
  as permissive
  for select
  to authenticated
using (public.util__auth_user_meets_min_app_role(workspace_id, 'data_sources'::public.app_type, 'viewer'::public.role_level));



  create policy "Data Sources viewers can select dictionary entry codings"
  on "public"."data_dictionaries__entry_codings"
  as permissive
  for select
  to authenticated
using (public.util__auth_user_meets_min_app_role(workspace_id, 'data_sources'::public.app_type, 'viewer'::public.role_level));


CREATE TRIGGER tr__data_dictionaries__guard_managed_columns BEFORE INSERT OR UPDATE ON public.data_dictionaries FOR EACH ROW EXECUTE FUNCTION public.data_dictionaries__guard_managed_columns();

CREATE TRIGGER tr__data_dictionaries__prevent_workspace_id_change BEFORE UPDATE OF workspace_id ON public.data_dictionaries FOR EACH ROW EXECUTE FUNCTION public.data_dictionaries__prevent_workspace_id_change();

CREATE TRIGGER tr__data_dictionaries__set_updated_at BEFORE UPDATE ON public.data_dictionaries FOR EACH ROW EXECUTE FUNCTION public.util__set_updated_at();

CREATE TRIGGER tr__data_dictionaries__validate_owner_profile BEFORE INSERT OR UPDATE OF owner_id, owner_profile_id, workspace_id ON public.data_dictionaries FOR EACH ROW EXECUTE FUNCTION public.data_dictionaries__validate_owner_profile();

CREATE TRIGGER tr__data_dictionaries__code_lists__set_updated_at BEFORE UPDATE ON public.data_dictionaries__code_lists FOR EACH ROW EXECUTE FUNCTION public.util__set_updated_at();

CREATE TRIGGER tr__data_dictionaries__entries__set_updated_at BEFORE UPDATE ON public.data_dictionaries__entries FOR EACH ROW EXECUTE FUNCTION public.util__set_updated_at();

CREATE TRIGGER tr__data_dictionaries__entry_codings__set_updated_at BEFORE UPDATE ON public.data_dictionaries__entry_codings FOR EACH ROW EXECUTE FUNCTION public.util__set_updated_at();



-- Privileges that `supabase db diff` cannot see: default, schema, column,
-- and view grants. Appended by `pnpm db:new-migration` from what
-- `supabase/schemas/` declares. Do not hand-edit; re-run the command.
revoke all privileges on function public.data_dictionaries__check_code_lists(p_dictionary_id uuid, p_code_lists jsonb) from public, anon, authenticated, service_role;
revoke all privileges on function public.data_dictionaries__check_codings(p_entries jsonb, p_code_lists jsonb) from public, anon, authenticated, service_role;
revoke all privileges on function public.data_dictionaries__check_entries(p_dictionary_id uuid, p_entries jsonb, p_code_lists jsonb) from public, anon, authenticated, service_role;
revoke all privileges on function public.data_dictionaries__check_pairs(p_code_lists jsonb) from public, anon, authenticated, service_role;
revoke all privileges on function public.data_dictionaries__guard_managed_columns() from public, anon, authenticated, service_role;
revoke all privileges on function public.data_dictionaries__prevent_workspace_id_change() from public, anon, authenticated, service_role;
revoke all privileges on function public.data_dictionaries__validate_owner_profile() from public, anon, authenticated, service_role;
revoke all privileges on function public.data_dictionaries__write_code_lists(p_dictionary_id uuid, p_workspace_id uuid, p_code_lists jsonb) from public, anon, authenticated, service_role;
revoke all privileges on function public.data_dictionaries__write_entries(p_dictionary_id uuid, p_workspace_id uuid, p_entries jsonb) from public, anon, authenticated, service_role;
revoke all privileges on function public.rpc_data_dictionaries__save(p_dictionary_id uuid, p_code_lists jsonb, p_entries jsonb) from public, anon, authenticated, service_role;
grant EXECUTE on function public.rpc_data_dictionaries__save(p_dictionary_id uuid, p_code_lists jsonb, p_entries jsonb) to "authenticated";
