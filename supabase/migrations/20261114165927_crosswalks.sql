create type "public"."crosswalks__codes_output" as enum ('labels', 'codes');

create type "public"."crosswalks__layout_status" as enum ('to_do', 'review', 'mapped', 'skipped');

create type "public"."crosswalks__mapping_reason" as enum ('name_and_type', 'same_values', 'similar_layout', 'meaning');

create type "public"."crosswalks__mapping_status" as enum ('suggested', 'confirmed');

  create table "public"."crosswalks" (
    "id" uuid not null default gen_random_uuid(),
    "workspace_id" uuid not null,
    "owner_id" uuid not null default auth.uid(),
    "owner_profile_id" uuid not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "name" text not null,
    "description" text,
    "output_dataset_id" uuid,
    "codes_output_as" public.crosswalks__codes_output not null default 'labels'::public.crosswalks__codes_output,
    "adds_source_column" boolean not null default true,
    "compiled_at" timestamp with time zone,
    "compiled_code_lists" jsonb
      );


alter table "public"."crosswalks" enable row level security;


  create table "public"."crosswalks__columns" (
    "id" uuid not null default gen_random_uuid(),
    "workspace_id" uuid not null,
    "crosswalk_id" uuid not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "name" text not null,
    "position" integer not null,
    "data_type" public.datasets__ava_data_type not null,
    "entry_id" uuid
      );


alter table "public"."crosswalks__columns" enable row level security;


  create table "public"."crosswalks__datasets" (
    "id" uuid not null default gen_random_uuid(),
    "workspace_id" uuid not null,
    "crosswalk_id" uuid not null,
    "created_at" timestamp with time zone not null default now(),
    "dataset_id" uuid not null,
    "layout_id" uuid not null
      );


alter table "public"."crosswalks__datasets" enable row level security;


  create table "public"."crosswalks__layouts" (
    "id" uuid not null default gen_random_uuid(),
    "workspace_id" uuid not null,
    "crosswalk_id" uuid not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "signature" text not null,
    "column_names" text[] not null,
    "is_reference" boolean not null default false,
    "status" public.crosswalks__layout_status not null default 'to_do'::public.crosswalks__layout_status
      );


alter table "public"."crosswalks__layouts" enable row level security;


  create table "public"."crosswalks__mappings" (
    "id" uuid not null default gen_random_uuid(),
    "workspace_id" uuid not null,
    "crosswalk_id" uuid not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "layout_id" uuid not null,
    "column_id" uuid not null,
    "fill" jsonb not null,
    "status" public.crosswalks__mapping_status not null default 'suggested'::public.crosswalks__mapping_status,
    "confidence" numeric,
    "reason" public.crosswalks__mapping_reason
      );


alter table "public"."crosswalks__mappings" enable row level security;

CREATE UNIQUE INDEX crosswalks__columns__name_unique ON public.crosswalks__columns USING btree (crosswalk_id, lower(name));

CREATE UNIQUE INDEX crosswalks__columns_id_crosswalk_id_key ON public.crosswalks__columns USING btree (id, crosswalk_id);

CREATE UNIQUE INDEX crosswalks__columns_pkey ON public.crosswalks__columns USING btree (id);

CREATE UNIQUE INDEX crosswalks__datasets_crosswalk_id_dataset_id_key ON public.crosswalks__datasets USING btree (crosswalk_id, dataset_id);

CREATE UNIQUE INDEX crosswalks__datasets_pkey ON public.crosswalks__datasets USING btree (id);

CREATE UNIQUE INDEX crosswalks__layouts__one_reference ON public.crosswalks__layouts USING btree (crosswalk_id) WHERE is_reference;

CREATE UNIQUE INDEX crosswalks__layouts_crosswalk_id_signature_key ON public.crosswalks__layouts USING btree (crosswalk_id, signature);

CREATE UNIQUE INDEX crosswalks__layouts_id_crosswalk_id_key ON public.crosswalks__layouts USING btree (id, crosswalk_id);

CREATE UNIQUE INDEX crosswalks__layouts_pkey ON public.crosswalks__layouts USING btree (id);

CREATE UNIQUE INDEX crosswalks__mappings_layout_id_column_id_key ON public.crosswalks__mappings USING btree (layout_id, column_id);

CREATE UNIQUE INDEX crosswalks__mappings_pkey ON public.crosswalks__mappings USING btree (id);

CREATE UNIQUE INDEX crosswalks_id_workspace_id_key ON public.crosswalks USING btree (id, workspace_id);

CREATE UNIQUE INDEX crosswalks_pkey ON public.crosswalks USING btree (id);

CREATE INDEX idx_crosswalks__columns__entry_id ON public.crosswalks__columns USING btree (entry_id);

CREATE INDEX idx_crosswalks__datasets__dataset_id ON public.crosswalks__datasets USING btree (dataset_id);

CREATE INDEX idx_crosswalks__datasets__layout_id ON public.crosswalks__datasets USING btree (layout_id);

CREATE INDEX idx_crosswalks__mappings__column_id ON public.crosswalks__mappings USING btree (column_id);

CREATE INDEX idx_crosswalks__mappings__crosswalk_id ON public.crosswalks__mappings USING btree (crosswalk_id);

CREATE INDEX idx_crosswalks__output_dataset_id ON public.crosswalks USING btree (output_dataset_id) WHERE (output_dataset_id IS NOT NULL);

CREATE INDEX idx_crosswalks__owner_profile_id ON public.crosswalks USING btree (owner_profile_id);

CREATE INDEX idx_crosswalks__workspace_owner ON public.crosswalks USING btree (workspace_id, owner_id);

alter table "public"."crosswalks" add constraint "crosswalks_pkey" PRIMARY KEY using index "crosswalks_pkey";

alter table "public"."crosswalks__columns" add constraint "crosswalks__columns_pkey" PRIMARY KEY using index "crosswalks__columns_pkey";

alter table "public"."crosswalks__datasets" add constraint "crosswalks__datasets_pkey" PRIMARY KEY using index "crosswalks__datasets_pkey";

alter table "public"."crosswalks__layouts" add constraint "crosswalks__layouts_pkey" PRIMARY KEY using index "crosswalks__layouts_pkey";

alter table "public"."crosswalks__mappings" add constraint "crosswalks__mappings_pkey" PRIMARY KEY using index "crosswalks__mappings_pkey";

alter table "public"."crosswalks" add constraint "crosswalks__compiled_code_lists_is_array" CHECK (((compiled_code_lists IS NULL) OR (jsonb_typeof(compiled_code_lists) = 'array'::text))) not valid;

alter table "public"."crosswalks" validate constraint "crosswalks__compiled_code_lists_is_array";

alter table "public"."crosswalks" add constraint "crosswalks__name_not_blank" CHECK ((btrim(name) <> ''::text)) not valid;

alter table "public"."crosswalks" validate constraint "crosswalks__name_not_blank";

alter table "public"."crosswalks" add constraint "crosswalks_id_workspace_id_key" UNIQUE using index "crosswalks_id_workspace_id_key";

alter table "public"."crosswalks" add constraint "crosswalks_output_dataset_id_fkey" FOREIGN KEY (output_dataset_id) REFERENCES public.datasets(id) ON UPDATE CASCADE ON DELETE SET NULL not valid;

alter table "public"."crosswalks" validate constraint "crosswalks_output_dataset_id_fkey";

alter table "public"."crosswalks" add constraint "crosswalks_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON UPDATE CASCADE not valid;

alter table "public"."crosswalks" validate constraint "crosswalks_owner_id_fkey";

alter table "public"."crosswalks" add constraint "crosswalks_owner_profile_id_fkey" FOREIGN KEY (owner_profile_id) REFERENCES public.user_profiles(id) ON UPDATE CASCADE not valid;

alter table "public"."crosswalks" validate constraint "crosswalks_owner_profile_id_fkey";

alter table "public"."crosswalks" add constraint "crosswalks_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."crosswalks" validate constraint "crosswalks_workspace_id_fkey";

alter table "public"."crosswalks__columns" add constraint "crosswalks__columns__name_not_blank" CHECK ((btrim(name) <> ''::text)) not valid;

alter table "public"."crosswalks__columns" validate constraint "crosswalks__columns__name_not_blank";

alter table "public"."crosswalks__columns" add constraint "crosswalks__columns__name_trimmed" CHECK ((name = btrim(name))) not valid;

alter table "public"."crosswalks__columns" validate constraint "crosswalks__columns__name_trimmed";

alter table "public"."crosswalks__columns" add constraint "crosswalks__columns_crosswalk_id_workspace_id_fkey" FOREIGN KEY (crosswalk_id, workspace_id) REFERENCES public.crosswalks(id, workspace_id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."crosswalks__columns" validate constraint "crosswalks__columns_crosswalk_id_workspace_id_fkey";

alter table "public"."crosswalks__columns" add constraint "crosswalks__columns_entry_id_fkey" FOREIGN KEY (entry_id) REFERENCES public.data_dictionaries__entries(id) ON UPDATE CASCADE ON DELETE SET NULL not valid;

alter table "public"."crosswalks__columns" validate constraint "crosswalks__columns_entry_id_fkey";

alter table "public"."crosswalks__columns" add constraint "crosswalks__columns_id_crosswalk_id_key" UNIQUE using index "crosswalks__columns_id_crosswalk_id_key";

alter table "public"."crosswalks__datasets" add constraint "crosswalks__datasets_crosswalk_id_dataset_id_key" UNIQUE using index "crosswalks__datasets_crosswalk_id_dataset_id_key";

alter table "public"."crosswalks__datasets" add constraint "crosswalks__datasets_crosswalk_id_workspace_id_fkey" FOREIGN KEY (crosswalk_id, workspace_id) REFERENCES public.crosswalks(id, workspace_id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."crosswalks__datasets" validate constraint "crosswalks__datasets_crosswalk_id_workspace_id_fkey";

alter table "public"."crosswalks__datasets" add constraint "crosswalks__datasets_dataset_id_fkey" FOREIGN KEY (dataset_id) REFERENCES public.datasets(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."crosswalks__datasets" validate constraint "crosswalks__datasets_dataset_id_fkey";

alter table "public"."crosswalks__datasets" add constraint "crosswalks__datasets_layout_id_crosswalk_id_fkey" FOREIGN KEY (layout_id, crosswalk_id) REFERENCES public.crosswalks__layouts(id, crosswalk_id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."crosswalks__datasets" validate constraint "crosswalks__datasets_layout_id_crosswalk_id_fkey";

alter table "public"."crosswalks__layouts" add constraint "crosswalks__layouts__has_columns" CHECK ((cardinality(column_names) > 0)) not valid;

alter table "public"."crosswalks__layouts" validate constraint "crosswalks__layouts__has_columns";

alter table "public"."crosswalks__layouts" add constraint "crosswalks__layouts__reference_is_mapped" CHECK (((NOT is_reference) OR (status = 'mapped'::public.crosswalks__layout_status))) not valid;

alter table "public"."crosswalks__layouts" validate constraint "crosswalks__layouts__reference_is_mapped";

alter table "public"."crosswalks__layouts" add constraint "crosswalks__layouts_crosswalk_id_signature_key" UNIQUE using index "crosswalks__layouts_crosswalk_id_signature_key";

alter table "public"."crosswalks__layouts" add constraint "crosswalks__layouts_crosswalk_id_workspace_id_fkey" FOREIGN KEY (crosswalk_id, workspace_id) REFERENCES public.crosswalks(id, workspace_id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."crosswalks__layouts" validate constraint "crosswalks__layouts_crosswalk_id_workspace_id_fkey";

alter table "public"."crosswalks__layouts" add constraint "crosswalks__layouts_id_crosswalk_id_key" UNIQUE using index "crosswalks__layouts_id_crosswalk_id_key";

alter table "public"."crosswalks__mappings" add constraint "crosswalks__mappings__confidence_range" CHECK (((confidence IS NULL) OR ((confidence >= (0)::numeric) AND (confidence <= (1)::numeric)))) not valid;

alter table "public"."crosswalks__mappings" validate constraint "crosswalks__mappings__confidence_range";

alter table "public"."crosswalks__mappings" add constraint "crosswalks__mappings__fill_is_object" CHECK ((jsonb_typeof(fill) = 'object'::text)) not valid;

alter table "public"."crosswalks__mappings" validate constraint "crosswalks__mappings__fill_is_object";

alter table "public"."crosswalks__mappings" add constraint "crosswalks__mappings_column_id_crosswalk_id_fkey" FOREIGN KEY (column_id, crosswalk_id) REFERENCES public.crosswalks__columns(id, crosswalk_id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."crosswalks__mappings" validate constraint "crosswalks__mappings_column_id_crosswalk_id_fkey";

alter table "public"."crosswalks__mappings" add constraint "crosswalks__mappings_crosswalk_id_workspace_id_fkey" FOREIGN KEY (crosswalk_id, workspace_id) REFERENCES public.crosswalks(id, workspace_id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."crosswalks__mappings" validate constraint "crosswalks__mappings_crosswalk_id_workspace_id_fkey";

alter table "public"."crosswalks__mappings" add constraint "crosswalks__mappings_layout_id_column_id_key" UNIQUE using index "crosswalks__mappings_layout_id_column_id_key";

alter table "public"."crosswalks__mappings" add constraint "crosswalks__mappings_layout_id_crosswalk_id_fkey" FOREIGN KEY (layout_id, crosswalk_id) REFERENCES public.crosswalks__layouts(id, crosswalk_id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."crosswalks__mappings" validate constraint "crosswalks__mappings_layout_id_crosswalk_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.crosswalks__authorize(p_crosswalk_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_workspace_id uuid;
begin
  -- Read without a lock: the caller has not been authorized yet.
  select c.workspace_id
  into v_workspace_id
  from public.crosswalks c
  where c.id = p_crosswalk_id;

  if v_workspace_id is null or not public.util__auth_user_meets_min_app_role (
    v_workspace_id,
    'data_sources'::public.app_type,
    'editor'::public.role_level
  ) then
    raise exception 'Only Data Sources editors can change a crosswalk'
      using errcode = '42501', hint = 'crosswalk_editor_required';
  end if;

  perform 1 from public.crosswalks where id = p_crosswalk_id for update;

  if not found then
    raise exception 'Only Data Sources editors can change a crosswalk'
      using errcode = '42501', hint = 'crosswalk_editor_required';
  end if;

  return v_workspace_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.crosswalks__check_column_fields(p_columns jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_uuid_pattern constant text :=
    '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
begin
  if exists (
    select 1
    from jsonb_array_elements(p_columns) as e (col)
    where
      coalesce(e.col ->> 'id', '') !~* v_uuid_pattern or
      jsonb_typeof(e.col -> 'name') is distinct from 'string' or
      jsonb_typeof(e.col -> 'position') is distinct from 'number' or
      coalesce(e.col ->> 'position', '') !~ '^[0-9]+$' or
      coalesce(e.col ->> 'data_type', '') <> all (
        enum_range(null::public.datasets__ava_data_type)::text[]
      ) or
      (e.col ->> 'entry_id') !~* v_uuid_pattern
  ) then
    raise exception 'Every column needs an id, a name, a whole-number position, and a known type'
      using errcode = '22023', hint = 'crosswalk_payload_invalid';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_columns) as e (col)
    group by lower(e.col ->> 'id')
    having count(*) > 1
  ) then
    raise exception 'A column id appears more than once'
      using errcode = '22023', hint = 'crosswalk_payload_invalid';
  end if;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.crosswalks__check_columns(p_crosswalk_id uuid, p_workspace_id uuid, p_settings jsonb, p_columns jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if exists (
    select 1
    from jsonb_to_recordset(p_columns) as c (id uuid)
    join public.crosswalks__columns cc on cc.id = c.id
    where cc.crosswalk_id <> p_crosswalk_id
  ) then
    raise exception 'Every column must be new or belong to this crosswalk'
      using errcode = '23514', hint = 'item_not_in_crosswalk';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_columns) as c (name text)
    where btrim(c.name) = ''
  ) then
    raise exception 'Every column needs a name'
      using errcode = '23514', hint = 'column_name_required';
  end if;

  -- `source_dataset` is `CrosswalkModule.SOURCE_COLUMN_NAME`, the column
  -- the combined dataset starts with when `adds_source_column` is on.
  if exists (
    select 1
    from jsonb_to_recordset(p_columns) as c (name text)
    group by lower(btrim(c.name))
    having count(*) > 1
  ) or (
    (p_settings ->> 'adds_source_column')::boolean and exists (
      select 1
      from jsonb_to_recordset(p_columns) as c (name text)
      where lower(btrim(c.name)) = 'source_dataset'
    )
  ) then
    raise exception 'Two columns of the combined dataset cannot share a name'
      using errcode = '23505', hint = 'column_names_not_unique';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_columns) as c (entry_id uuid)
    where
      c.entry_id is not null and
      not exists (
        select 1
        from public.data_dictionaries__entries en
        where en.id = c.entry_id and en.workspace_id = p_workspace_id
      )
  ) then
    raise exception 'A column''s entry must belong to a dictionary in this workspace'
      using errcode = '23514', hint = 'entry_not_in_workspace';
  end if;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.crosswalks__check_combined_binding_fields(p_bindings jsonb, p_compiled_code_lists jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_uuid_pattern constant text :=
    '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
begin
  if exists (
    select 1
    from jsonb_array_elements(p_bindings) as e (binding)
    where
      jsonb_typeof(e.binding -> 'column_name') is distinct from 'string' or
      coalesce(e.binding ->> 'dictionary_id', '') !~* v_uuid_pattern or
      coalesce(e.binding ->> 'entry_id', '') !~* v_uuid_pattern or
      coalesce(e.binding ->> 'code_list_id', '') !~* v_uuid_pattern or
      coalesce(e.binding ->> 'direction', '') <> all (
        enum_range(null::public.dataset_columns__binding_direction)::text[]
      )
  ) or exists (
    select 1
    from jsonb_array_elements(p_bindings) as e (binding)
    group by lower(e.binding ->> 'column_name')
    having count(*) > 1
  ) then
    raise exception 'Every binding needs a column, a dictionary, an entry, a code list, and a direction, with no column twice'
      using errcode = '22023', hint = 'combined_columns_invalid';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_compiled_code_lists) as e (item)
    where
      coalesce(e.item ->> 'code_list_id', '') !~* v_uuid_pattern or
      jsonb_typeof(e.item -> 'fingerprint') is distinct from 'string'
  ) then
    raise exception 'Every embedded code list needs an id and a fingerprint'
      using errcode = '22023', hint = 'combined_columns_invalid';
  end if;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.crosswalks__check_combined_bindings(p_workspace_id uuid, p_columns jsonb, p_bindings jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if exists (
    select 1
    from jsonb_to_recordset(p_bindings) as b (column_name text)
    where not exists (
      select 1
      from jsonb_array_elements(p_columns) as e (col)
      where lower(e.col ->> 'name') = lower(b.column_name)
    )
  ) then
    raise exception 'Every binding must name a column of the combined dataset'
      using errcode = '23514', hint = 'binding_column_missing';
  end if;

  -- The entry's workspace stands for all three: its dictionary has the
  -- same workspace (composite key), and so does every list it codes with.
  if exists (
    select 1
    from jsonb_to_recordset(p_bindings) as b (dictionary_id uuid, entry_id uuid, code_list_id uuid)
    where not exists (
      select 1
      from public.data_dictionaries__entries en
      join public.data_dictionaries__entry_codings ec on ec.entry_id = en.id
      where
        en.id = b.entry_id and
        en.dictionary_id = b.dictionary_id and
        en.workspace_id = p_workspace_id and
        ec.code_list_id = b.code_list_id
    )
  ) then
    raise exception 'Every binding''s dictionary, entry, and code list must belong together in this workspace'
      using errcode = '23514', hint = 'binding_not_in_workspace';
  end if;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.crosswalks__check_combined_payload(p_columns jsonb, p_bindings jsonb, p_compiled_code_lists jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if
    jsonb_typeof(p_columns) is distinct from 'array' or
    jsonb_typeof(p_bindings) is distinct from 'array' or
    jsonb_typeof(p_compiled_code_lists) is distinct from 'array'
  then
    raise exception 'Columns, bindings, and code lists must be arrays'
      using errcode = '22023', hint = 'combined_columns_invalid';
  end if;

  -- Only now are the three sets known to be arrays.
  if jsonb_array_length(p_columns) = 0 or exists (
    select 1
    from jsonb_array_elements(p_columns) as e (col)
    where
      jsonb_typeof(e.col -> 'name') is distinct from 'string' or
      btrim(coalesce(e.col ->> 'name', '')) = '' or
      coalesce(e.col ->> 'data_type', '') <> all (
        enum_range(null::public.datasets__ava_data_type)::text[]
      )
  ) then
    raise exception 'The combined dataset needs at least one column, each with a name and a known type'
      using errcode = '22023', hint = 'combined_columns_invalid';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_columns) as e (col)
    group by lower(e.col ->> 'name')
    having count(*) > 1
  ) then
    raise exception 'Two columns of the combined dataset cannot share a name'
      using errcode = '22023', hint = 'combined_columns_invalid';
  end if;

  perform public.crosswalks__check_combined_binding_fields (p_bindings, p_compiled_code_lists);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.crosswalks__check_datasets(p_crosswalk_id uuid, p_workspace_id uuid, p_layouts jsonb, p_datasets jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if exists (
    select 1
    from jsonb_to_recordset(p_datasets) as d (layout_id uuid)
    where not exists (
      select 1
      from jsonb_to_recordset(p_layouts) as l (id uuid)
      where l.id = d.layout_id
    )
  ) then
    raise exception 'Every dataset must join a layout saved with it'
      using errcode = '23514', hint = 'item_not_in_crosswalk';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_datasets) as d (dataset_id uuid)
    left join public.datasets ds on ds.id = d.dataset_id and ds.workspace_id = p_workspace_id
    where
      ds.id is null or
      not public.util__auth_user_can_access_resource (
        'dataset'::public.resource_type,
        d.dataset_id,
        'viewer'::public.role_level
      )
  ) then
    raise exception 'Every dataset must be one you can open in this workspace'
      using errcode = '42501', hint = 'dataset_not_readable';
  end if;

  if exists (
    select 1
    from public.crosswalks__datasets cd
    where
      cd.crosswalk_id = p_crosswalk_id and
      not exists (
        select 1
        from jsonb_to_recordset(p_layouts) as l (id uuid)
        where l.id = cd.layout_id
      ) and
      not public.util__auth_user_can_access_resource (
        'dataset'::public.resource_type,
        cd.dataset_id,
        'viewer'::public.role_level
      )
  ) then
    raise exception 'A layout this save removes still holds a dataset you cannot open'
      using errcode = '42501', hint = 'dataset_not_readable';
  end if;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.crosswalks__check_layout_fields(p_layouts jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_uuid_pattern constant text :=
    '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
begin
  if exists (
    select 1
    from jsonb_array_elements(p_layouts) as e (layout)
    where
      coalesce(e.layout ->> 'id', '') !~* v_uuid_pattern or
      jsonb_typeof(e.layout -> 'signature') is distinct from 'string' or
      btrim(coalesce(e.layout ->> 'signature', '')) = '' or
      jsonb_typeof(e.layout -> 'column_names') is distinct from 'array' or
      jsonb_typeof(e.layout -> 'is_reference') is distinct from 'boolean' or
      coalesce(e.layout ->> 'status', '') <> all (
        enum_range(null::public.crosswalks__layout_status)::text[]
      )
  ) then
    raise exception 'Every layout needs an id, a signature, column names, a reference flag, and a known status'
      using errcode = '22023', hint = 'crosswalk_payload_invalid';
  end if;

  -- Only now is every `column_names` known to be an array.
  if exists (
    select 1
    from jsonb_array_elements(p_layouts) as e (layout)
    where
      jsonb_array_length(e.layout -> 'column_names') = 0 or
      exists (
        select 1
        from jsonb_array_elements(e.layout -> 'column_names') as n (column_name)
        where jsonb_typeof(n.column_name) <> 'string'
      )
  ) then
    raise exception 'Every layout needs at least one column name, each a text'
      using errcode = '22023', hint = 'crosswalk_payload_invalid';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_layouts) as e (layout)
    group by lower(e.layout ->> 'id')
    having count(*) > 1
  ) then
    raise exception 'A layout id appears more than once'
      using errcode = '22023', hint = 'crosswalk_payload_invalid';
  end if;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.crosswalks__check_layouts(p_crosswalk_id uuid, p_layouts jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if exists (
    select 1
    from jsonb_to_recordset(p_layouts) as l (id uuid)
    join public.crosswalks__layouts cl on cl.id = l.id
    where cl.crosswalk_id <> p_crosswalk_id
  ) then
    raise exception 'Every layout must be new or belong to this crosswalk'
      using errcode = '23514', hint = 'item_not_in_crosswalk';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_layouts) as l (signature text)
    group by l.signature
    having count(*) > 1
  ) then
    raise exception 'Two layouts of one crosswalk cannot share a signature'
      using errcode = '23505', hint = 'layout_signatures_not_unique';
  end if;

  -- A crosswalk with no datasets yet has no layouts, and no reference.
  if jsonb_array_length(p_layouts) > 0 and (
    (
      select count(*)
      from jsonb_to_recordset(p_layouts) as l (is_reference boolean)
      where l.is_reference
    ) <> 1 or
    exists (
      select 1
      from jsonb_to_recordset(p_layouts) as l (is_reference boolean, status text)
      where l.is_reference and l.status <> 'mapped'
    )
  ) then
    raise exception 'A crosswalk with layouts has exactly one reference layout, and it is mapped'
      using errcode = '23514', hint = 'reference_layout_required';
  end if;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.crosswalks__check_mappings(p_crosswalk_id uuid, p_columns jsonb, p_layouts jsonb, p_mappings jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if exists (
    select 1
    from jsonb_to_recordset(p_mappings) as m (id uuid)
    join public.crosswalks__mappings cm on cm.id = m.id
    where cm.crosswalk_id <> p_crosswalk_id
  ) or exists (
    select 1
    from jsonb_to_recordset(p_mappings) as m (layout_id uuid, column_id uuid)
    where
      not exists (
        select 1
        from jsonb_to_recordset(p_layouts) as l (id uuid)
        where l.id = m.layout_id
      ) or
      not exists (
        select 1
        from jsonb_to_recordset(p_columns) as c (id uuid)
        where c.id = m.column_id
      )
  ) then
    raise exception 'Every mapping must be new or belong to this crosswalk, and fill a column saved with it for a layout saved with it'
      using errcode = '23514', hint = 'item_not_in_crosswalk';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_mappings) as m (layout_id uuid, column_id uuid)
    group by m.layout_id, m.column_id
    having count(*) > 1
  ) then
    raise exception 'A layout fills each column once'
      using errcode = '23505', hint = 'mappings_not_unique';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_mappings) as e (mapping)
    where not public.crosswalks__is_fill_valid (e.mapping -> 'fill')
  ) then
    raise exception 'Every fill must be a version 1 fill of a known kind'
      using errcode = '22023', hint = 'fill_invalid';
  end if;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.crosswalks__check_membership_and_mapping_fields(p_datasets jsonb, p_mappings jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_uuid_pattern constant text :=
    '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
begin
  if exists (
    select 1
    from jsonb_array_elements(p_datasets) as e (membership)
    where
      coalesce(e.membership ->> 'dataset_id', '') !~* v_uuid_pattern or
      coalesce(e.membership ->> 'layout_id', '') !~* v_uuid_pattern
  ) or exists (
    select 1
    from jsonb_array_elements(p_datasets) as e (membership)
    group by lower(e.membership ->> 'dataset_id')
    having count(*) > 1
  ) then
    raise exception 'Every dataset needs a layout, and joins the crosswalk once'
      using errcode = '22023', hint = 'crosswalk_payload_invalid';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_mappings) as e (mapping)
    where
      coalesce(e.mapping ->> 'id', '') !~* v_uuid_pattern or
      coalesce(e.mapping ->> 'layout_id', '') !~* v_uuid_pattern or
      coalesce(e.mapping ->> 'column_id', '') !~* v_uuid_pattern or
      coalesce(e.mapping ->> 'status', '') <> all (
        enum_range(null::public.crosswalks__mapping_status)::text[]
      ) or
      (e.mapping ->> 'reason') <> all (
        enum_range(null::public.crosswalks__mapping_reason)::text[]
      ) or
      case jsonb_typeof(coalesce(e.mapping -> 'confidence', 'null'::jsonb))
        when 'null' then false
        when 'number' then (e.mapping ->> 'confidence')::numeric not between 0 and 1
        else true
      end
  ) or exists (
    select 1
    from jsonb_array_elements(p_mappings) as e (mapping)
    group by lower(e.mapping ->> 'id')
    having count(*) > 1
  ) then
    raise exception 'Every mapping needs an id, a layout, a column, a known status and reason, and a confidence from 0 to 1'
      using errcode = '22023', hint = 'crosswalk_payload_invalid';
  end if;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.crosswalks__check_payload(p_settings jsonb, p_columns jsonb, p_layouts jsonb, p_datasets jsonb, p_mappings jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if
    jsonb_typeof(p_settings) is distinct from 'object' or
    jsonb_typeof(p_settings -> 'name') is distinct from 'string' or
    jsonb_typeof(coalesce(p_settings -> 'description', 'null'::jsonb)) not in ('string', 'null') or
    coalesce(p_settings ->> 'codes_output_as', '') <> all (
      enum_range(null::public.crosswalks__codes_output)::text[]
    ) or
    jsonb_typeof(p_settings -> 'adds_source_column') is distinct from 'boolean'
  then
    raise exception 'Settings need a name, a description, how codes come out, and whether a source column is added'
      using errcode = '22023', hint = 'crosswalk_payload_invalid';
  end if;

  if exists (
    select 1
    from (values (p_columns), (p_layouts), (p_datasets), (p_mappings)) as s (items)
    where jsonb_typeof(s.items) is distinct from 'array'
  ) then
    raise exception 'Columns, layouts, datasets, and mappings must be arrays'
      using errcode = '22023', hint = 'crosswalk_payload_invalid';
  end if;

  -- Only now is every set known to be an array.
  if exists (
    select 1
    from (values (p_columns), (p_layouts), (p_datasets), (p_mappings)) as s (items)
    cross join lateral jsonb_array_elements(s.items) as e (item)
    where jsonb_typeof(e.item) <> 'object'
  ) then
    raise exception 'Every column, layout, dataset, and mapping must be an object'
      using errcode = '22023', hint = 'crosswalk_payload_invalid';
  end if;

  perform public.crosswalks__check_column_fields (p_columns);
  perform public.crosswalks__check_layout_fields (p_layouts);
  perform public.crosswalks__check_membership_and_mapping_fields (p_datasets, p_mappings);

  if btrim(p_settings ->> 'name') = '' then
    raise exception 'A crosswalk needs a name'
      using errcode = '23514', hint = 'crosswalk_name_required';
  end if;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.crosswalks__create_combined_dataset(p_workspace_id uuid, p_dataset_id uuid, p_name text, p_raw_sql text, p_columns jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if not public.util__can_manage_workspace_settings (p_workspace_id) then
    raise exception 'Only a workspace admin can add a dataset'
      using errcode = '42501', hint = 'dataset_creator_required';
  end if;

  -- The columns are built inline, as `datasets__virtual__create_linked`
  -- builds them.
  perform public.rpc_datasets__add_virtual_dataset (
    p_dataset_id,
    p_workspace_id,
    p_name,
    null,
    (
      select
        array_agg(
          row(
            w.name,
            w.name,
            null,
            public.datasets__ava_data_type_to_duckdb (w.data_type)::text,
            public.datasets__ava_data_type_to_duckdb (w.data_type),
            w.data_type,
            w.column_idx
          )::public.dataset_column_input
          order by w.column_idx
        )
      from public.crosswalks__read_combined_columns (p_columns) as w
    ),
    p_raw_sql
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.crosswalks__guard_managed_columns()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if current_user <> 'authenticated' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if
      new.output_dataset_id is not null or
      new.compiled_at is not null or
      new.compiled_code_lists is not null
    then
      raise exception 'a new crosswalk has no combined dataset yet'
        using errcode = '42501';
    end if;
  elsif
    new.owner_id is distinct from old.owner_id or
    new.owner_profile_id is distinct from old.owner_profile_id or
    new.output_dataset_id is distinct from old.output_dataset_id or
    new.compiled_at is distinct from old.compiled_at or
    new.compiled_code_lists is distinct from old.compiled_code_lists
  then
    raise exception 'a crosswalk''s owner and combined dataset are managed'
      using errcode = '42501';
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.crosswalks__is_fill_valid(p_fill jsonb)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select coalesce(
    jsonb_typeof(p_fill) = 'object' and
    p_fill -> 'version' = '1'::jsonb and
    case p_fill ->> 'kind'
      when 'column' then
        jsonb_typeof(p_fill -> 'source_column') = 'string' and
        btrim(p_fill ->> 'source_column') <> ''
      when 'constant' then jsonb_typeof(p_fill -> 'value') = 'string'
      when 'expression' then
        jsonb_typeof(p_fill -> 'sql') = 'string' and
        btrim(p_fill ->> 'sql') <> ''
      when 'empty' then true
      else false
    end,
    false
  );
$function$
;

CREATE OR REPLACE FUNCTION public.crosswalks__prevent_workspace_id_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if new.workspace_id is distinct from old.workspace_id then
    raise exception 'crosswalk workspace_id cannot be changed'
      using errcode = '23514';
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.crosswalks__read_combined_columns(p_columns jsonb)
 RETURNS TABLE(name text, data_type public.datasets__ava_data_type, column_idx integer)
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select
    e.col ->> 'name',
    (e.col ->> 'data_type')::public.datasets__ava_data_type,
    (e.column_index - 1)::integer
  from jsonb_array_elements(p_columns) with ordinality as e (col, column_index);
$function$
;

CREATE OR REPLACE FUNCTION public.crosswalks__reconcile_combined_columns(p_workspace_id uuid, p_dataset_id uuid, p_columns jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_kept_ids uuid[];
begin
  with kept as (
    select distinct on (lower(dc.name))
      dc.id,
      lower(dc.name) as name_key
    from public.dataset_columns dc
    where dc.dataset_id = p_dataset_id and dc.dictionary_binding_id is null
    order by lower(dc.name), dc.column_idx, dc.id
  ), updated as (
    update public.dataset_columns dc
    set
      original_name = w.name,
      name = w.name,
      original_data_type = public.datasets__ava_data_type_to_duckdb (w.data_type)::text,
      detected_data_type = public.datasets__ava_data_type_to_duckdb (w.data_type),
      data_type = w.data_type,
      column_idx = w.column_idx
    from public.crosswalks__read_combined_columns (p_columns) as w
    join kept k on k.name_key = lower(w.name)
    where dc.id = k.id
    returning dc.id
  )
  select coalesce(array_agg(updated.id), '{}')
  into v_kept_ids
  from updated;

  delete from public.dataset_columns dc
  where dc.dataset_id = p_dataset_id and dc.id <> all (v_kept_ids);

  insert into public.dataset_columns (
    dataset_id, workspace_id, original_name, name, original_data_type, detected_data_type, data_type, column_idx
  )
  select
    p_dataset_id, p_workspace_id, w.name, w.name,
    public.datasets__ava_data_type_to_duckdb (w.data_type)::text,
    public.datasets__ava_data_type_to_duckdb (w.data_type),
    w.data_type, w.column_idx
  from public.crosswalks__read_combined_columns (p_columns) as w
  where not exists (
    select 1
    from public.dataset_columns dc
    where dc.dataset_id = p_dataset_id and lower(dc.name) = lower(w.name)
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.crosswalks__update_combined_dataset(p_workspace_id uuid, p_output_dataset_id uuid, p_dataset_id uuid, p_name text, p_raw_sql text, p_columns jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if p_dataset_id is distinct from p_output_dataset_id then
    raise exception 'This crosswalk updates a different combined dataset'
      using errcode = '23514', hint = 'combined_dataset_mismatch';
  end if;

  if not public.util__auth_user_can_access_resource (
    'dataset'::public.resource_type,
    p_dataset_id,
    'editor'::public.role_level
  ) then
    raise exception 'Only an editor of the combined dataset can update it'
      using errcode = '42501', hint = 'dataset_editor_required';
  end if;

  perform 1 from public.datasets where id = p_dataset_id for no key update;

  update public.datasets
  set name = p_name
  where id = p_dataset_id;

  update public.datasets__virtual
  set raw_sql = p_raw_sql
  where dataset_id = p_dataset_id;

  perform public.crosswalks__reconcile_combined_columns (p_workspace_id, p_dataset_id, p_columns);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.crosswalks__validate_owner_profile()
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
    raise exception 'crosswalk owner profile must match owner and workspace'
      using errcode = '23514';
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.crosswalks__write_columns(p_crosswalk_id uuid, p_workspace_id uuid, p_columns jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  -- Park saved names under a unique placeholder first, so a save that swaps
  -- two names never meets the unique name index partway through.
  update public.crosswalks__columns c
  set name = '~' || c.id::text
  where c.crosswalk_id = p_crosswalk_id;

  insert into public.crosswalks__columns (id, workspace_id, crosswalk_id, name, position, data_type, entry_id)
  select
    c.id, p_workspace_id, p_crosswalk_id, btrim(c.name), c.position,
    c.data_type::public.datasets__ava_data_type, c.entry_id
  from jsonb_to_recordset(p_columns) as c (
    id uuid, name text, position integer, data_type text, entry_id uuid
  )
  on conflict (id) do update
  set
    name = excluded.name,
    position = excluded.position,
    data_type = excluded.data_type,
    entry_id = excluded.entry_id
  where public.crosswalks__columns.crosswalk_id = excluded.crosswalk_id;

  -- Their mappings go with them.
  delete from public.crosswalks__columns c
  where
    c.crosswalk_id = p_crosswalk_id and
    not exists (
      select 1
      from jsonb_to_recordset(p_columns) as pc (id uuid)
      where pc.id = c.id
    );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.crosswalks__write_combined_bindings(p_workspace_id uuid, p_dataset_id uuid, p_bindings jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  delete from public.dataset_columns__dictionary_bindings b
  where b.dataset_id = p_dataset_id;

  insert into public.dataset_columns__dictionary_bindings (
    workspace_id, dataset_id, dataset_column_id, dictionary_id, entry_id, code_list_id,
    mode, direction, applied_dictionary_version
  )
  select
    p_workspace_id, p_dataset_id, dc.id, b.dictionary_id, b.entry_id, b.code_list_id,
    'reference', b.direction::public.dataset_columns__binding_direction, d.version
  from jsonb_to_recordset(p_bindings) as b (
    column_name text, dictionary_id uuid, entry_id uuid, code_list_id uuid, direction text
  )
  join public.dataset_columns dc on dc.dataset_id = p_dataset_id and lower(dc.name) = lower(b.column_name)
  join public.data_dictionaries d on d.id = b.dictionary_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.crosswalks__write_datasets(p_crosswalk_id uuid, p_workspace_id uuid, p_datasets jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  delete from public.crosswalks__datasets cd
  where
    cd.crosswalk_id = p_crosswalk_id and
    not exists (
      select 1
      from jsonb_to_recordset(p_datasets) as d (dataset_id uuid)
      where d.dataset_id = cd.dataset_id
    ) and
    public.util__auth_user_can_access_resource (
      'dataset'::public.resource_type,
      cd.dataset_id,
      'viewer'::public.role_level
    );

  insert into public.crosswalks__datasets (workspace_id, crosswalk_id, dataset_id, layout_id)
  select p_workspace_id, p_crosswalk_id, d.dataset_id, d.layout_id
  from jsonb_to_recordset(p_datasets) as d (dataset_id uuid, layout_id uuid)
  on conflict (crosswalk_id, dataset_id) do update
  set layout_id = excluded.layout_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.crosswalks__write_layouts(p_crosswalk_id uuid, p_workspace_id uuid, p_layouts jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  -- Park saved signatures and clear the reference first, so a save that
  -- swaps two signatures or moves the reference never meets a unique
  -- index partway through.
  update public.crosswalks__layouts l
  set signature = '~' || l.id::text, is_reference = false
  where l.crosswalk_id = p_crosswalk_id;

  insert into public.crosswalks__layouts (id, workspace_id, crosswalk_id, signature, column_names, is_reference, status)
  select
    l.id, p_workspace_id, p_crosswalk_id, l.signature, l.column_names,
    l.is_reference, l.status::public.crosswalks__layout_status
  from jsonb_to_recordset(p_layouts) as l (
    id uuid, signature text, column_names text[], is_reference boolean, status text
  )
  on conflict (id) do update
  set
    signature = excluded.signature,
    column_names = excluded.column_names,
    is_reference = excluded.is_reference,
    status = excluded.status
  where public.crosswalks__layouts.crosswalk_id = excluded.crosswalk_id;

  -- Their memberships and mappings go with them. The checks already
  -- refused dropping a layout that holds a membership the caller cannot
  -- view.
  delete from public.crosswalks__layouts l
  where
    l.crosswalk_id = p_crosswalk_id and
    not exists (
      select 1
      from jsonb_to_recordset(p_layouts) as pl (id uuid)
      where pl.id = l.id
    );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.crosswalks__write_mappings(p_crosswalk_id uuid, p_workspace_id uuid, p_mappings jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  delete from public.crosswalks__mappings cm
  where
    cm.crosswalk_id = p_crosswalk_id and
    not exists (
      select 1
      from jsonb_to_recordset(p_mappings) as m (id uuid, layout_id uuid, column_id uuid)
      where m.id = cm.id and m.layout_id = cm.layout_id and m.column_id = cm.column_id
    );

  insert into public.crosswalks__mappings (
    id, workspace_id, crosswalk_id, layout_id, column_id, fill, status, confidence, reason
  )
  select
    m.id, p_workspace_id, p_crosswalk_id, m.layout_id, m.column_id, m.fill,
    m.status::public.crosswalks__mapping_status, m.confidence,
    m.reason::public.crosswalks__mapping_reason
  from jsonb_to_recordset(p_mappings) as m (
    id uuid, layout_id uuid, column_id uuid, fill jsonb, status text, confidence numeric, reason text
  )
  on conflict (id) do update
  set
    fill = excluded.fill,
    status = excluded.status,
    confidence = excluded.confidence,
    reason = excluded.reason
  where public.crosswalks__mappings.crosswalk_id = excluded.crosswalk_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_crosswalks__save(p_crosswalk_id uuid, p_settings jsonb, p_columns jsonb, p_layouts jsonb, p_datasets jsonb, p_mappings jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_workspace_id uuid;
  v_columns jsonb := coalesce(p_columns, '[]'::jsonb);
  v_layouts jsonb := coalesce(p_layouts, '[]'::jsonb);
  v_datasets jsonb := coalesce(p_datasets, '[]'::jsonb);
  v_mappings jsonb := coalesce(p_mappings, '[]'::jsonb);
begin
  v_workspace_id := public.crosswalks__authorize (p_crosswalk_id);

  perform public.crosswalks__check_payload (p_settings, v_columns, v_layouts, v_datasets, v_mappings);
  perform public.crosswalks__check_columns (p_crosswalk_id, v_workspace_id, p_settings, v_columns);
  perform public.crosswalks__check_layouts (p_crosswalk_id, v_layouts);
  perform public.crosswalks__check_datasets (p_crosswalk_id, v_workspace_id, v_layouts, v_datasets);
  perform public.crosswalks__check_mappings (p_crosswalk_id, v_columns, v_layouts, v_mappings);

  perform public.crosswalks__write_columns (p_crosswalk_id, v_workspace_id, v_columns);
  perform public.crosswalks__write_layouts (p_crosswalk_id, v_workspace_id, v_layouts);
  perform public.crosswalks__write_datasets (p_crosswalk_id, v_workspace_id, v_datasets);
  perform public.crosswalks__write_mappings (p_crosswalk_id, v_workspace_id, v_mappings);

  -- Always written, so `updated_at` moves on every save.
  update public.crosswalks
  set
    name = btrim(p_settings ->> 'name'),
    description = nullif(btrim(p_settings ->> 'description'), ''),
    codes_output_as = (p_settings ->> 'codes_output_as')::public.crosswalks__codes_output,
    adds_source_column = (p_settings ->> 'adds_source_column')::boolean
  where id = p_crosswalk_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_crosswalks__save_combined_dataset(p_crosswalk_id uuid, p_dataset_id uuid, p_dataset_name text, p_raw_sql text, p_columns jsonb, p_bindings jsonb, p_compiled_code_lists jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_workspace_id uuid;
  v_output_dataset_id uuid;
begin
  v_workspace_id := public.crosswalks__authorize (p_crosswalk_id);

  if coalesce(btrim(p_dataset_name), '') = '' then
    raise exception 'The combined dataset needs a name'
      using errcode = '23514', hint = 'combined_dataset_name_required';
  end if;

  perform public.crosswalks__check_combined_payload (p_columns, p_bindings, p_compiled_code_lists);
  perform public.crosswalks__check_combined_bindings (v_workspace_id, p_columns, p_bindings);

  select c.output_dataset_id
  into v_output_dataset_id
  from public.crosswalks c
  where c.id = p_crosswalk_id;

  if v_output_dataset_id is null then
    perform public.crosswalks__create_combined_dataset (v_workspace_id, p_dataset_id, btrim(p_dataset_name), p_raw_sql, p_columns);
  else
    perform public.crosswalks__update_combined_dataset (
      v_workspace_id, v_output_dataset_id, p_dataset_id, btrim(p_dataset_name), p_raw_sql, p_columns
    );
  end if;

  perform public.crosswalks__write_combined_bindings (v_workspace_id, p_dataset_id, p_bindings);

  update public.crosswalks
  set
    output_dataset_id = p_dataset_id,
    compiled_at = now(),
    compiled_code_lists = p_compiled_code_lists
  where id = p_crosswalk_id;

  return p_dataset_id;
end;
$function$
;

grant delete on table "public"."crosswalks" to "authenticated";

grant insert on table "public"."crosswalks" to "authenticated";

grant select on table "public"."crosswalks" to "authenticated";

grant update on table "public"."crosswalks" to "authenticated";

grant delete on table "public"."crosswalks" to "service_role";

grant insert on table "public"."crosswalks" to "service_role";

grant select on table "public"."crosswalks" to "service_role";

grant update on table "public"."crosswalks" to "service_role";

grant select on table "public"."crosswalks__columns" to "authenticated";

grant delete on table "public"."crosswalks__columns" to "service_role";

grant insert on table "public"."crosswalks__columns" to "service_role";

grant select on table "public"."crosswalks__columns" to "service_role";

grant update on table "public"."crosswalks__columns" to "service_role";

grant select on table "public"."crosswalks__datasets" to "authenticated";

grant delete on table "public"."crosswalks__datasets" to "service_role";

grant insert on table "public"."crosswalks__datasets" to "service_role";

grant select on table "public"."crosswalks__datasets" to "service_role";

grant update on table "public"."crosswalks__datasets" to "service_role";

grant select on table "public"."crosswalks__layouts" to "authenticated";

grant delete on table "public"."crosswalks__layouts" to "service_role";

grant insert on table "public"."crosswalks__layouts" to "service_role";

grant select on table "public"."crosswalks__layouts" to "service_role";

grant update on table "public"."crosswalks__layouts" to "service_role";

grant select on table "public"."crosswalks__mappings" to "authenticated";

grant delete on table "public"."crosswalks__mappings" to "service_role";

grant insert on table "public"."crosswalks__mappings" to "service_role";

grant select on table "public"."crosswalks__mappings" to "service_role";

grant update on table "public"."crosswalks__mappings" to "service_role";


  create policy "Data Sources editors can insert crosswalks they own"
  on "public"."crosswalks"
  as permissive
  for insert
  to authenticated
with check (((owner_id = ( SELECT auth.uid() AS uid)) AND public.util__auth_user_meets_min_app_role(workspace_id, 'data_sources'::public.app_type, 'editor'::public.role_level)));



  create policy "Data Sources editors can update crosswalks"
  on "public"."crosswalks"
  as permissive
  for update
  to authenticated
using (public.util__auth_user_meets_min_app_role(workspace_id, 'data_sources'::public.app_type, 'editor'::public.role_level))
with check (public.util__auth_user_meets_min_app_role(workspace_id, 'data_sources'::public.app_type, 'editor'::public.role_level));



  create policy "Data Sources viewers can select crosswalks"
  on "public"."crosswalks"
  as permissive
  for select
  to authenticated
using (public.util__auth_user_meets_min_app_role(workspace_id, 'data_sources'::public.app_type, 'viewer'::public.role_level));



  create policy "Owners and Data Sources admins can delete crosswalks"
  on "public"."crosswalks"
  as permissive
  for delete
  to authenticated
using ((((owner_id = ( SELECT auth.uid() AS uid)) AND public.util__auth_user_meets_min_app_role(workspace_id, 'data_sources'::public.app_type, 'editor'::public.role_level)) OR public.util__auth_user_meets_min_app_role(workspace_id, 'data_sources'::public.app_type, 'admin'::public.role_level)));



  create policy "Data Sources viewers can select crosswalk columns"
  on "public"."crosswalks__columns"
  as permissive
  for select
  to authenticated
using (public.util__auth_user_meets_min_app_role(workspace_id, 'data_sources'::public.app_type, 'viewer'::public.role_level));



  create policy "Dataset viewers can select their crosswalk memberships"
  on "public"."crosswalks__datasets"
  as permissive
  for select
  to authenticated
using ((public.util__auth_user_meets_min_app_role(workspace_id, 'data_sources'::public.app_type, 'viewer'::public.role_level) AND public.util__auth_user_can_access_resource('dataset'::public.resource_type, dataset_id, 'viewer'::public.role_level)));



  create policy "Data Sources viewers can select crosswalk layouts"
  on "public"."crosswalks__layouts"
  as permissive
  for select
  to authenticated
using (public.util__auth_user_meets_min_app_role(workspace_id, 'data_sources'::public.app_type, 'viewer'::public.role_level));



  create policy "Data Sources viewers can select crosswalk mappings"
  on "public"."crosswalks__mappings"
  as permissive
  for select
  to authenticated
using (public.util__auth_user_meets_min_app_role(workspace_id, 'data_sources'::public.app_type, 'viewer'::public.role_level));


CREATE TRIGGER tr__crosswalks__guard_managed_columns BEFORE INSERT OR UPDATE ON public.crosswalks FOR EACH ROW EXECUTE FUNCTION public.crosswalks__guard_managed_columns();

CREATE TRIGGER tr__crosswalks__prevent_workspace_id_change BEFORE UPDATE OF workspace_id ON public.crosswalks FOR EACH ROW EXECUTE FUNCTION public.crosswalks__prevent_workspace_id_change();

CREATE TRIGGER tr__crosswalks__set_updated_at BEFORE UPDATE ON public.crosswalks FOR EACH ROW EXECUTE FUNCTION public.util__set_updated_at();

CREATE TRIGGER tr__crosswalks__validate_owner_profile BEFORE INSERT OR UPDATE OF owner_id, owner_profile_id, workspace_id ON public.crosswalks FOR EACH ROW EXECUTE FUNCTION public.crosswalks__validate_owner_profile();

CREATE TRIGGER tr__crosswalks__columns__set_updated_at BEFORE UPDATE ON public.crosswalks__columns FOR EACH ROW EXECUTE FUNCTION public.util__set_updated_at();

CREATE TRIGGER tr__crosswalks__layouts__set_updated_at BEFORE UPDATE ON public.crosswalks__layouts FOR EACH ROW EXECUTE FUNCTION public.util__set_updated_at();

CREATE TRIGGER tr__crosswalks__mappings__set_updated_at BEFORE UPDATE ON public.crosswalks__mappings FOR EACH ROW EXECUTE FUNCTION public.util__set_updated_at();



-- Privileges that `supabase db diff` cannot see: default, schema, column,
-- and view grants. Appended by `pnpm db:new-migration` from what
-- `supabase/schemas/` declares. Do not hand-edit; re-run the command.
revoke all privileges on function public.crosswalks__authorize(p_crosswalk_id uuid) from public, anon, authenticated, service_role;
revoke all privileges on function public.crosswalks__check_column_fields(p_columns jsonb) from public, anon, authenticated, service_role;
revoke all privileges on function public.crosswalks__check_columns(p_crosswalk_id uuid, p_workspace_id uuid, p_settings jsonb, p_columns jsonb) from public, anon, authenticated, service_role;
revoke all privileges on function public.crosswalks__check_combined_binding_fields(p_bindings jsonb, p_compiled_code_lists jsonb) from public, anon, authenticated, service_role;
revoke all privileges on function public.crosswalks__check_combined_bindings(p_workspace_id uuid, p_columns jsonb, p_bindings jsonb) from public, anon, authenticated, service_role;
revoke all privileges on function public.crosswalks__check_combined_payload(p_columns jsonb, p_bindings jsonb, p_compiled_code_lists jsonb) from public, anon, authenticated, service_role;
revoke all privileges on function public.crosswalks__check_datasets(p_crosswalk_id uuid, p_workspace_id uuid, p_layouts jsonb, p_datasets jsonb) from public, anon, authenticated, service_role;
revoke all privileges on function public.crosswalks__check_layout_fields(p_layouts jsonb) from public, anon, authenticated, service_role;
revoke all privileges on function public.crosswalks__check_layouts(p_crosswalk_id uuid, p_layouts jsonb) from public, anon, authenticated, service_role;
revoke all privileges on function public.crosswalks__check_mappings(p_crosswalk_id uuid, p_columns jsonb, p_layouts jsonb, p_mappings jsonb) from public, anon, authenticated, service_role;
revoke all privileges on function public.crosswalks__check_membership_and_mapping_fields(p_datasets jsonb, p_mappings jsonb) from public, anon, authenticated, service_role;
revoke all privileges on function public.crosswalks__check_payload(p_settings jsonb, p_columns jsonb, p_layouts jsonb, p_datasets jsonb, p_mappings jsonb) from public, anon, authenticated, service_role;
revoke all privileges on function public.crosswalks__create_combined_dataset(p_workspace_id uuid, p_dataset_id uuid, p_name text, p_raw_sql text, p_columns jsonb) from public, anon, authenticated, service_role;
revoke all privileges on function public.crosswalks__guard_managed_columns() from public, anon, authenticated, service_role;
revoke all privileges on function public.crosswalks__is_fill_valid(p_fill jsonb) from public, anon, authenticated, service_role;
revoke all privileges on function public.crosswalks__prevent_workspace_id_change() from public, anon, authenticated, service_role;
revoke all privileges on function public.crosswalks__read_combined_columns(p_columns jsonb) from public, anon, authenticated, service_role;
revoke all privileges on function public.crosswalks__reconcile_combined_columns(p_workspace_id uuid, p_dataset_id uuid, p_columns jsonb) from public, anon, authenticated, service_role;
revoke all privileges on function public.crosswalks__update_combined_dataset(p_workspace_id uuid, p_output_dataset_id uuid, p_dataset_id uuid, p_name text, p_raw_sql text, p_columns jsonb) from public, anon, authenticated, service_role;
revoke all privileges on function public.crosswalks__validate_owner_profile() from public, anon, authenticated, service_role;
revoke all privileges on function public.crosswalks__write_columns(p_crosswalk_id uuid, p_workspace_id uuid, p_columns jsonb) from public, anon, authenticated, service_role;
revoke all privileges on function public.crosswalks__write_combined_bindings(p_workspace_id uuid, p_dataset_id uuid, p_bindings jsonb) from public, anon, authenticated, service_role;
revoke all privileges on function public.crosswalks__write_datasets(p_crosswalk_id uuid, p_workspace_id uuid, p_datasets jsonb) from public, anon, authenticated, service_role;
revoke all privileges on function public.crosswalks__write_layouts(p_crosswalk_id uuid, p_workspace_id uuid, p_layouts jsonb) from public, anon, authenticated, service_role;
revoke all privileges on function public.crosswalks__write_mappings(p_crosswalk_id uuid, p_workspace_id uuid, p_mappings jsonb) from public, anon, authenticated, service_role;
revoke all privileges on function public.rpc_crosswalks__save_combined_dataset(p_crosswalk_id uuid, p_dataset_id uuid, p_dataset_name text, p_raw_sql text, p_columns jsonb, p_bindings jsonb, p_compiled_code_lists jsonb) from public, anon, authenticated, service_role;
grant EXECUTE on function public.rpc_crosswalks__save_combined_dataset(p_crosswalk_id uuid, p_dataset_id uuid, p_dataset_name text, p_raw_sql text, p_columns jsonb, p_bindings jsonb, p_compiled_code_lists jsonb) to "authenticated";
revoke all privileges on function public.rpc_crosswalks__save(p_crosswalk_id uuid, p_settings jsonb, p_columns jsonb, p_layouts jsonb, p_datasets jsonb, p_mappings jsonb) from public, anon, authenticated, service_role;
grant EXECUTE on function public.rpc_crosswalks__save(p_crosswalk_id uuid, p_settings jsonb, p_columns jsonb, p_layouts jsonb, p_datasets jsonb, p_mappings jsonb) to "authenticated";
