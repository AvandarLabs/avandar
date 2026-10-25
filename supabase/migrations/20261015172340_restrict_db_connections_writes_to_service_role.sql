drop policy "User can delete db_connections in their workspace" on "public"."db_connections";

drop policy "User can insert db_connections in their workspace" on "public"."db_connections";

drop policy "User can update db_connections in their workspace" on "public"."db_connections";

drop policy "User can delete db_connections__postgres in their workspace" on "public"."db_connections__postgres";

drop policy "User can insert db_connections__postgres in their workspace" on "public"."db_connections__postgres";

drop policy "User can update db_connections__postgres in their workspace" on "public"."db_connections__postgres";

revoke delete on table "public"."db_connections" from "authenticated";

revoke insert on table "public"."db_connections" from "authenticated";

revoke update on table "public"."db_connections" from "authenticated";

revoke delete on table "public"."db_connections__postgres" from "authenticated";

revoke insert on table "public"."db_connections__postgres" from "authenticated";

revoke update on table "public"."db_connections__postgres" from "authenticated";

