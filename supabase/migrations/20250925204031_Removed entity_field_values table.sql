drop trigger if exists "tr_entity_field_values__set_updated_at" on "public"."entity_field_values";

drop policy "
  User can DELETE entity field values in their workspace
" on "public"."entity_field_values";

drop policy "
  User can INSERT entity field values in their workspace
" on "public"."entity_field_values";

drop policy "
  User can SELECT entity field values in their workspace
" on "public"."entity_field_values";

drop policy "
  User can UPDATE entity field values in their workspace
" on "public"."entity_field_values";

revoke delete on table "public"."entity_field_values" from "anon";

revoke insert on table "public"."entity_field_values" from "anon";

revoke references on table "public"."entity_field_values" from "anon";

revoke select on table "public"."entity_field_values" from "anon";

revoke trigger on table "public"."entity_field_values" from "anon";

revoke truncate on table "public"."entity_field_values" from "anon";

revoke update on table "public"."entity_field_values" from "anon";

revoke delete on table "public"."entity_field_values" from "authenticated";

revoke insert on table "public"."entity_field_values" from "authenticated";

revoke references on table "public"."entity_field_values" from "authenticated";

revoke select on table "public"."entity_field_values" from "authenticated";

revoke trigger on table "public"."entity_field_values" from "authenticated";

revoke truncate on table "public"."entity_field_values" from "authenticated";

revoke update on table "public"."entity_field_values" from "authenticated";

revoke delete on table "public"."entity_field_values" from "service_role";

revoke insert on table "public"."entity_field_values" from "service_role";

revoke references on table "public"."entity_field_values" from "service_role";

revoke select on table "public"."entity_field_values" from "service_role";

revoke trigger on table "public"."entity_field_values" from "service_role";

revoke truncate on table "public"."entity_field_values" from "service_role";

revoke update on table "public"."entity_field_values" from "service_role";

alter table "public"."entity_field_values" drop constraint "entity_field_values_dataset_id_fkey";

alter table "public"."entity_field_values" drop constraint "entity_field_values_entity_config_id_fkey";

alter table "public"."entity_field_values" drop constraint "entity_field_values_entity_field_config_id_fkey";

alter table "public"."entity_field_values" drop constraint "entity_field_values_entity_id_fkey";

alter table "public"."entity_field_values" drop constraint "entity_field_values_workspace_id_fkey";

alter table "public"."entity_field_values" drop constraint "entity_field_values_pkey";

drop index if exists "public"."entity_field_values_pkey";

drop table "public"."entity_field_values";


