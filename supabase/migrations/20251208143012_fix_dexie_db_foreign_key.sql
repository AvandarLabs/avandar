alter table "public"."dexie_dbs" drop constraint "dexie_dbs_user_id_fkey";

alter table "public"."dexie_dbs" add constraint "dexie_dbs_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."dexie_dbs" validate constraint "dexie_dbs_user_id_fkey";


