CREATE UNIQUE INDEX entities__entity_config_external_id_unique ON public.entities USING btree (entity_config_id, external_id);

alter table "public"."entities" add constraint "entities__entity_config_external_id_unique" UNIQUE using index "entities__entity_config_external_id_unique";


