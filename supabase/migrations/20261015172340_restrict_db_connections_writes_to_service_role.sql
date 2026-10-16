drop policy "User can delete connections in their workspace" on "public"."connections";

drop policy "User can insert connections in their workspace" on "public"."connections";

drop policy "User can update connections in their workspace" on "public"."connections";

drop policy "User can delete connections__postgres in their workspace" on "public"."connections__postgres";

drop policy "User can insert connections__postgres in their workspace" on "public"."connections__postgres";

drop policy "User can update connections__postgres in their workspace" on "public"."connections__postgres";

revoke delete on table "public"."connections" from "authenticated";

revoke insert on table "public"."connections" from "authenticated";

revoke update on table "public"."connections" from "authenticated";

revoke delete on table "public"."connections__postgres" from "authenticated";

revoke insert on table "public"."connections__postgres" from "authenticated";

revoke update on table "public"."connections__postgres" from "authenticated";

