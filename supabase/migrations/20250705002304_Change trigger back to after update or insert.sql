drop trigger if exists "tr_entity_field_configs__validate_title_id_fields" on "public"."entity_field_configs";

CREATE TRIGGER tr_entity_field_configs__validate_title_id_fields AFTER INSERT OR UPDATE ON public.entity_field_configs FOR EACH ROW EXECUTE FUNCTION entity_field_configs__validate_title_id_fields();


