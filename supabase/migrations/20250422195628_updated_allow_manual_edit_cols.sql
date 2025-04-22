alter table "public"."entity_field_configs" drop constraint "id_field_is_dimension";

alter table "public"."entity_field_configs" drop constraint "title_field_is_dimension";

alter table "public"."entity_field_configs" alter column "allow_manual_edit" set default false;

alter table "public"."entity_field_configs" alter column "allow_manual_edit" set not null;

alter table "public"."value_extractor_config__adjacent_field" drop column "allow_manual_edit";

alter table "public"."value_extractor_config__manual_entry" drop column "allow_manual_edit";

alter table "public"."entity_field_configs" add constraint "metrics_cant_be_ids" CHECK ((NOT ((class = 'metric'::entity_field_config__class) AND is_id_field))) not valid;

alter table "public"."entity_field_configs" validate constraint "metrics_cant_be_ids";

alter table "public"."entity_field_configs" add constraint "metrics_cant_be_titles" CHECK ((NOT ((class = 'metric'::entity_field_config__class) AND is_title_field))) not valid;

alter table "public"."entity_field_configs" validate constraint "metrics_cant_be_titles";

alter table "public"."entity_field_configs" add constraint "metrics_dont_allow_manual_edit" CHECK ((NOT ((class = 'metric'::entity_field_config__class) AND allow_manual_edit))) not valid;

alter table "public"."entity_field_configs" validate constraint "metrics_dont_allow_manual_edit";


