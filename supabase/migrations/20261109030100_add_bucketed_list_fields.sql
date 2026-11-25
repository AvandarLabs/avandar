create type "public"."concept_attributes__bucket_grain" as enum ('day', 'week', 'month', 'quarter', 'year');

alter table "public"."attribute_mappings__dataset_column" add column "bucket_column_id" uuid;

alter table "public"."concept_attributes" add column "bucket_grain" public.concept_attributes__bucket_grain;

alter table "public"."concept_attributes" add constraint "concept_attributes__bucket_grain_dataset_value_only" CHECK (((bucket_grain IS NULL) OR ((mapping_type = 'dataset_column'::public.concept_attributes__mapping_type) AND (NOT is_label) AND (NOT is_identifier)))) not valid;

alter table "public"."concept_attributes" validate constraint "concept_attributes__bucket_grain_dataset_value_only";

alter table "public"."concept_attributes" add constraint "concept_attributes__bucket_grain_requires_array" CHECK (((bucket_grain IS NULL) OR is_array)) not valid;

alter table "public"."concept_attributes" validate constraint "concept_attributes__bucket_grain_requires_array";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.attribute_mappings__dataset_column__validate_bucket_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_bucket_grain public.concept_attributes__bucket_grain;
  v_column_dataset_id uuid;
  v_column_data_type public.datasets__ava_data_type;
begin
  select attribute.bucket_grain
  into v_bucket_grain
  from public.concept_attributes attribute
  where
    attribute.id = new.concept_attribute_id
    and attribute.workspace_id = new.workspace_id;

  if v_bucket_grain is null then
    if new.bucket_column_id is not null then
      raise exception 'A mapping for a field without a bucket_grain cannot have a bucket_column_id'
        using
          errcode = '23514',
          hint = 'bucket_column_not_allowed',
          detail = format('concept_attribute_id %s', new.concept_attribute_id);
    end if;
    return new;
  end if;

  if new.bucket_column_id is null then
    raise exception 'A mapping for a field with a bucket_grain needs a bucket_column_id'
      using
        errcode = '23514',
        hint = 'bucket_column_required',
        detail = format('concept_attribute_id %s', new.concept_attribute_id);
  end if;

  select dataset_column.dataset_id, dataset_column.data_type
  into v_column_dataset_id, v_column_data_type
  from public.dataset_columns dataset_column
  where
    dataset_column.id = new.bucket_column_id
    and dataset_column.workspace_id = new.workspace_id;

  -- A column that does not exist, or that belongs to another workspace,
  -- leaves both variables null, which lands here too.
  if v_column_dataset_id is distinct from new.dataset_id then
    raise exception 'bucket_column_id must be a column of the mapping''s dataset'
      using
        errcode = '23514',
        hint = 'bucket_column_not_in_dataset',
        detail = format(
          'bucket_column_id %s, dataset_id %s',
          new.bucket_column_id,
          new.dataset_id
        );
  end if;

  if v_column_data_type not in ('date', 'timestamp') then
    raise exception 'bucket_column_id must be a date or timestamp column'
      using
        errcode = '23514',
        hint = 'bucket_column_not_a_date',
        detail = format('bucket_column_id %s', new.bucket_column_id);
  end if;

  return new;
end;
$function$
;

CREATE TRIGGER tr__attribute_mappings__dataset_column__validate_bucket_column BEFORE INSERT OR UPDATE OF concept_attribute_id, dataset_id, bucket_column_id ON public.attribute_mappings__dataset_column FOR EACH ROW EXECUTE FUNCTION public.attribute_mappings__dataset_column__validate_bucket_column();



-- Privileges that `supabase db diff` cannot see: default, schema, column,
-- and view grants. Appended by `pnpm db:new-migration` from what
-- `supabase/schemas/` declares. Do not hand-edit; re-run the command.
revoke all privileges on function public.attribute_mappings__dataset_column__validate_bucket_column() from public, anon, authenticated, service_role;
