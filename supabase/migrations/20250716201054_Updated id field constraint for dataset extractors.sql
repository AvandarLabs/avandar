drop trigger if exists "tr_entity_field_configs__validate_title_id_fields" on "public"."entity_field_configs";

drop function if exists "public"."entity_field_configs__validate_title_id_fields"();

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.entity_field_configs__validate_title_and_id_fields()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  -- Count title fields for this entity_config
  if (
    select count(*) from public.entity_field_configs
    where entity_config_id = new.entity_config_id and is_title_field
  ) != 1 then
    raise exception 'There must be exactly one title field per entity config';
  end if;

  -- For fields that extract from datasets, ensure each source dataset
  -- is associated with exactly one ID field.
  if exists (
    select 1 from public.entity_field_configs field_config
      join public.value_extractors__dataset_column_value dataset_col_extractor
        on field_config.id = dataset_col_extractor.entity_field_config_id
    where field_config.entity_config_id = new.entity_config_id
    group by dataset_col_extractor.dataset_id
      having count(case when field_config.is_id_field then 1 end) != 1
  ) then
    raise exception 'Each dataset must have exactly one ID field.';
  end if;

  return new;
end;
$function$
;

CREATE TRIGGER tr_entity_field_configs__validate_title_id_fields AFTER INSERT OR UPDATE ON public.entity_field_configs FOR EACH ROW EXECUTE FUNCTION entity_field_configs__validate_title_and_id_fields();


