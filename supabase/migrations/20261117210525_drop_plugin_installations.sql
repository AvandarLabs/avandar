drop trigger if exists "tr__plugin_installations__prevent_identity_change" on "public"."plugin_installations";

drop trigger if exists "tr__plugin_installations__set_updated_at" on "public"."plugin_installations";

drop policy "Members can SELECT plugin installations" on "public"."plugin_installations";

drop policy "Settings admins can DELETE plugin installations" on "public"."plugin_installations";

drop policy "Settings admins can INSERT plugin installations" on "public"."plugin_installations";

drop policy "Settings admins can UPDATE plugin installations" on "public"."plugin_installations";

revoke delete on table "public"."plugin_installations" from "authenticated";

revoke insert on table "public"."plugin_installations" from "authenticated";

revoke select on table "public"."plugin_installations" from "authenticated";

revoke update on table "public"."plugin_installations" from "authenticated";

revoke delete on table "public"."plugin_installations" from "service_role";

revoke insert on table "public"."plugin_installations" from "service_role";

revoke select on table "public"."plugin_installations" from "service_role";

revoke update on table "public"."plugin_installations" from "service_role";

alter table "public"."plugin_installations" drop constraint "plugin_installations__plugin_id_format";

alter table "public"."plugin_installations" drop constraint "plugin_installations__workspace_plugin_unique";

alter table "public"."plugin_installations" drop constraint "plugin_installations_installed_by_fkey";

alter table "public"."plugin_installations" drop constraint "plugin_installations_workspace_id_fkey";

drop function if exists "public"."plugin_installations__prevent_identity_change"();

alter table "public"."plugin_installations" drop constraint "plugin_installations_pkey";

drop index if exists "public"."plugin_installations__workspace_plugin_unique";

drop index if exists "public"."plugin_installations_pkey";

drop table "public"."plugin_installations";

