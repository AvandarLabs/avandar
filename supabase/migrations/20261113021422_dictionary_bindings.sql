create type "public"."dataset_columns__binding_direction" as enum ('decode', 'encode');

create type "public"."dataset_columns__binding_mode" as enum ('reference', 'convert');

  create table "public"."dataset_columns__dictionary_bindings" (
    "id" uuid not null default gen_random_uuid(),
    "workspace_id" uuid not null,
    "dataset_id" uuid not null,
    "dataset_column_id" uuid not null,
    "dictionary_id" uuid,
    "entry_id" uuid,
    "code_list_id" uuid,
    "mode" public.dataset_columns__binding_mode not null default 'reference'::public.dataset_columns__binding_mode,
    "direction" public.dataset_columns__binding_direction not null default 'decode'::public.dataset_columns__binding_direction,
    "applied_dictionary_version" integer not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."dataset_columns__dictionary_bindings" enable row level security;

CREATE UNIQUE INDEX dataset_columns__dictionary_bindings_dataset_column_id_key ON public.dataset_columns__dictionary_bindings USING btree (dataset_column_id);

CREATE UNIQUE INDEX dataset_columns__dictionary_bindings_pkey ON public.dataset_columns__dictionary_bindings USING btree (id);

CREATE INDEX idx_dataset_columns__dictionary_bindings__code_list_id ON public.dataset_columns__dictionary_bindings USING btree (code_list_id);

CREATE INDEX idx_dataset_columns__dictionary_bindings__dataset_id ON public.dataset_columns__dictionary_bindings USING btree (dataset_id);

CREATE INDEX idx_dataset_columns__dictionary_bindings__dictionary_id ON public.dataset_columns__dictionary_bindings USING btree (dictionary_id);

CREATE INDEX idx_dataset_columns__dictionary_bindings__entry_id ON public.dataset_columns__dictionary_bindings USING btree (entry_id);

alter table "public"."dataset_columns__dictionary_bindings" add constraint "dataset_columns__dictionary_bindings_pkey" PRIMARY KEY using index "dataset_columns__dictionary_bindings_pkey";

alter table "public"."dataset_columns__dictionary_bindings" add constraint "dataset_columns__dictionary_bindin_dataset_id_workspace_id_fkey" FOREIGN KEY (dataset_id, workspace_id) REFERENCES public.datasets(id, workspace_id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."dataset_columns__dictionary_bindings" validate constraint "dataset_columns__dictionary_bindin_dataset_id_workspace_id_fkey";

alter table "public"."dataset_columns__dictionary_bindings" add constraint "dataset_columns__dictionary_bindings_code_list_id_fkey" FOREIGN KEY (code_list_id) REFERENCES public.data_dictionaries__code_lists(id) ON UPDATE CASCADE ON DELETE SET NULL not valid;

alter table "public"."dataset_columns__dictionary_bindings" validate constraint "dataset_columns__dictionary_bindings_code_list_id_fkey";

alter table "public"."dataset_columns__dictionary_bindings" add constraint "dataset_columns__dictionary_bindings_dataset_column_id_fkey" FOREIGN KEY (dataset_column_id) REFERENCES public.dataset_columns(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."dataset_columns__dictionary_bindings" validate constraint "dataset_columns__dictionary_bindings_dataset_column_id_fkey";

alter table "public"."dataset_columns__dictionary_bindings" add constraint "dataset_columns__dictionary_bindings_dataset_column_id_key" UNIQUE using index "dataset_columns__dictionary_bindings_dataset_column_id_key";

alter table "public"."dataset_columns__dictionary_bindings" add constraint "dataset_columns__dictionary_bindings_dictionary_id_fkey" FOREIGN KEY (dictionary_id) REFERENCES public.data_dictionaries(id) ON UPDATE CASCADE ON DELETE SET NULL not valid;

alter table "public"."dataset_columns__dictionary_bindings" validate constraint "dataset_columns__dictionary_bindings_dictionary_id_fkey";

alter table "public"."dataset_columns__dictionary_bindings" add constraint "dataset_columns__dictionary_bindings_entry_id_fkey" FOREIGN KEY (entry_id) REFERENCES public.data_dictionaries__entries(id) ON UPDATE CASCADE ON DELETE SET NULL not valid;

alter table "public"."dataset_columns__dictionary_bindings" validate constraint "dataset_columns__dictionary_bindings_entry_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.dataset_columns__check_binding_entries(p_workspace_id uuid, p_bindings jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if exists (
    select 1
    from jsonb_to_recordset(p_bindings) as b (dictionary_id uuid, entry_id uuid)
    left join public.data_dictionaries__entries en on
      en.id = b.entry_id and
      en.dictionary_id = b.dictionary_id and
      en.workspace_id = p_workspace_id
    where en.id is null
  ) then
    raise exception 'Every entry must belong to its dictionary in this workspace'
      using errcode = '23514', hint = 'entry_not_in_dictionary';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_bindings) as b (entry_id uuid, code_list_id uuid)
    where
      b.code_list_id is not null and
      not exists (
        select 1
        from public.data_dictionaries__entry_codings ec
        where ec.entry_id = b.entry_id and ec.code_list_id = b.code_list_id
      )
  ) then
    raise exception 'A binding''s code list must be one its entry uses'
      using errcode = '23514', hint = 'code_list_not_in_entry';
  end if;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.dataset_columns__check_bindings(p_dataset_id uuid, p_workspace_id uuid, p_bindings jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if jsonb_typeof(p_bindings) is distinct from 'array' or exists (
    select 1
    from jsonb_to_recordset(p_bindings) as b (
      dataset_column_id uuid, dictionary_id uuid, entry_id uuid, mode text, direction text
    )
    where
      b.dataset_column_id is null or
      b.dictionary_id is null or
      b.entry_id is null or
      b.mode is null or
      b.mode not in (select unnest(enum_range(null::public.dataset_columns__binding_mode))::text) or
      b.direction is null or
      b.direction not in (select unnest(enum_range(null::public.dataset_columns__binding_direction))::text)
  ) then
    raise exception 'Bindings must be an array of complete bindings'
      using errcode = '22023', hint = 'binding_payload_invalid';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_bindings) as b (dataset_column_id uuid)
    group by b.dataset_column_id
    having count(*) > 1
  ) then
    raise exception 'A column appears more than once'
      using errcode = '22023', hint = 'binding_payload_invalid';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_bindings) as b (mode text)
    where b.mode <> 'reference'
  ) then
    raise exception 'Only reference bindings can be applied'
      using errcode = '0A000', hint = 'binding_mode_unsupported';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_bindings) as b (dataset_column_id uuid)
    left join public.dataset_columns dc on dc.id = b.dataset_column_id
    where dc.id is null or dc.dataset_id <> p_dataset_id
  ) then
    raise exception 'Every column must belong to this dataset'
      using errcode = '23514', hint = 'column_not_in_dataset';
  end if;

  perform public.dataset_columns__check_binding_entries (p_workspace_id, p_bindings);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.dataset_columns__dictionary_bindings__keep_workspace_id()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if new.workspace_id is distinct from old.workspace_id then
    raise exception 'binding workspace_id cannot be changed'
      using errcode = '23514';
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.dataset_columns__dictionary_bindings__remove_for_dictionary()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  delete from public.dataset_columns__dictionary_bindings b
  where b.dictionary_id = old.id and b.mode = 'reference';

  return old;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.dataset_columns__dictionary_bindings__remove_for_entry()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  delete from public.dataset_columns__dictionary_bindings b
  where b.entry_id = old.id and b.mode = 'reference';

  return old;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.dataset_columns__write_bindings(p_dataset_id uuid, p_workspace_id uuid, p_bindings jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  delete from public.dataset_columns__dictionary_bindings b
  where
    b.dataset_id = p_dataset_id and
    not exists (
      select 1
      from jsonb_to_recordset(p_bindings) as n (dataset_column_id uuid)
      where n.dataset_column_id = b.dataset_column_id
    );

  insert into public.dataset_columns__dictionary_bindings (
    workspace_id, dataset_id, dataset_column_id, dictionary_id, entry_id,
    code_list_id, mode, direction, applied_dictionary_version
  )
  select
    p_workspace_id, p_dataset_id, n.dataset_column_id, n.dictionary_id, n.entry_id,
    n.code_list_id, n.mode::public.dataset_columns__binding_mode,
    n.direction::public.dataset_columns__binding_direction, d.version
  from jsonb_to_recordset(p_bindings) as n (
    dataset_column_id uuid, dictionary_id uuid, entry_id uuid,
    code_list_id uuid, mode text, direction text
  )
  join public.data_dictionaries d on d.id = n.dictionary_id
  on conflict (dataset_column_id) do update
  set
    dictionary_id = excluded.dictionary_id,
    entry_id = excluded.entry_id,
    code_list_id = excluded.code_list_id,
    mode = excluded.mode,
    direction = excluded.direction,
    applied_dictionary_version = excluded.applied_dictionary_version;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_dataset_columns__apply_dictionaries(p_dataset_id uuid, p_bindings jsonb)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_workspace_id uuid;
  v_bindings jsonb := coalesce(p_bindings, '[]'::jsonb);
  v_count integer;
begin
  -- Read without a lock: the caller has not been authorized yet.
  select ds.workspace_id
  into v_workspace_id
  from public.datasets ds
  where ds.id = p_dataset_id;

  -- A missing dataset and a forbidden one raise the same error, so the
  -- function cannot be used to probe for dataset ids.
  if v_workspace_id is null or not public.util__auth_user_can_access_resource (
    'dataset'::public.resource_type,
    p_dataset_id,
    'editor'::public.role_level
  ) then
    raise exception 'Only an editor of this dataset can apply dictionaries to it'
      using errcode = '42501', hint = 'dataset_editor_required';
  end if;

  if not public.util__auth_user_meets_min_app_role (
    v_workspace_id,
    'data_sources'::public.app_type,
    'viewer'::public.role_level
  ) then
    raise exception 'Only Data Sources viewers can read dictionaries'
      using errcode = '42501', hint = 'dictionary_viewer_required';
  end if;

  -- Two applies to one dataset run one at a time.
  perform 1 from public.datasets where id = p_dataset_id for update;

  perform public.dataset_columns__check_bindings (p_dataset_id, v_workspace_id, v_bindings);
  perform public.dataset_columns__write_bindings (p_dataset_id, v_workspace_id, v_bindings);

  select count(*)::integer
  into v_count
  from public.dataset_columns__dictionary_bindings b
  where b.dataset_id = p_dataset_id;

  return v_count;
end;
$function$
;

grant select on table "public"."dataset_columns__dictionary_bindings" to "authenticated";

grant delete on table "public"."dataset_columns__dictionary_bindings" to "service_role";

grant insert on table "public"."dataset_columns__dictionary_bindings" to "service_role";

grant select on table "public"."dataset_columns__dictionary_bindings" to "service_role";

grant update on table "public"."dataset_columns__dictionary_bindings" to "service_role";


  create policy "Dataset viewers can select their columns' dictionary bindings"
  on "public"."dataset_columns__dictionary_bindings"
  as permissive
  for select
  to authenticated
using (public.util__auth_user_can_access_resource('dataset'::public.resource_type, dataset_id, 'viewer'::public.role_level));


CREATE TRIGGER tr__data_dictionaries__remove_reference_bindings BEFORE DELETE ON public.data_dictionaries FOR EACH ROW EXECUTE FUNCTION public.dataset_columns__dictionary_bindings__remove_for_dictionary();

CREATE TRIGGER tr__data_dictionaries__entries__remove_reference_bindings BEFORE DELETE ON public.data_dictionaries__entries FOR EACH ROW EXECUTE FUNCTION public.dataset_columns__dictionary_bindings__remove_for_entry();

CREATE TRIGGER tr__dataset_columns__dictionary_bindings__keep_workspace_id BEFORE UPDATE OF workspace_id ON public.dataset_columns__dictionary_bindings FOR EACH ROW EXECUTE FUNCTION public.dataset_columns__dictionary_bindings__keep_workspace_id();

CREATE TRIGGER tr__dataset_columns__dictionary_bindings__set_updated_at BEFORE UPDATE ON public.dataset_columns__dictionary_bindings FOR EACH ROW EXECUTE FUNCTION public.util__set_updated_at();



-- Privileges that `supabase db diff` cannot see: default, schema, column,
-- and view grants. Appended by `pnpm db:new-migration` from what
-- `supabase/schemas/` declares. Do not hand-edit; re-run the command.
revoke all privileges on function public.dataset_columns__check_binding_entries(p_workspace_id uuid, p_bindings jsonb) from public, anon, authenticated, service_role;
revoke all privileges on function public.dataset_columns__check_bindings(p_dataset_id uuid, p_workspace_id uuid, p_bindings jsonb) from public, anon, authenticated, service_role;
revoke all privileges on function public.dataset_columns__dictionary_bindings__keep_workspace_id() from public, anon, authenticated, service_role;
revoke all privileges on function public.dataset_columns__dictionary_bindings__remove_for_dictionary() from public, anon, authenticated, service_role;
revoke all privileges on function public.dataset_columns__dictionary_bindings__remove_for_entry() from public, anon, authenticated, service_role;
revoke all privileges on function public.dataset_columns__write_bindings(p_dataset_id uuid, p_workspace_id uuid, p_bindings jsonb) from public, anon, authenticated, service_role;
revoke all privileges on function public.rpc_dataset_columns__apply_dictionaries(p_dataset_id uuid, p_bindings jsonb) from public, anon, authenticated, service_role;
grant EXECUTE on function public.rpc_dataset_columns__apply_dictionaries(p_dataset_id uuid, p_bindings jsonb) to "authenticated";
