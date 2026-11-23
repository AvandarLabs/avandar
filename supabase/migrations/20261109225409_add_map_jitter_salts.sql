  create table "public"."map_jitter_salts" (
    "map_id" uuid not null,
    "salt" uuid not null default gen_random_uuid()
      );


alter table "public"."map_jitter_salts" enable row level security;

CREATE UNIQUE INDEX map_jitter_salts_pkey ON public.map_jitter_salts USING btree (map_id);

alter table "public"."map_jitter_salts" add constraint "map_jitter_salts_pkey" PRIMARY KEY using index "map_jitter_salts_pkey";

alter table "public"."map_jitter_salts" add constraint "map_jitter_salts_map_id_fkey" FOREIGN KEY (map_id) REFERENCES public.maps(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."map_jitter_salts" validate constraint "map_jitter_salts_map_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.map_jitter_salts__create_for_map()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  insert into public.map_jitter_salts (map_id)
  values (new.id)
  on conflict (map_id) do nothing;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_maps__get_or_create_jitter_salt(p_map_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_salt uuid;
begin
  if not public.util__auth_user_can_update_resource (
    'map'::public.resource_type,
    p_map_id
  ) then
    return null;
  end if;

  insert into public.map_jitter_salts (map_id)
  values (p_map_id)
  on conflict (map_id) do nothing;

  select s.salt
  into v_salt
  from public.map_jitter_salts s
  where s.map_id = p_map_id;

  return v_salt;
end;
$function$
;

grant select on table "public"."map_jitter_salts" to "authenticated";

grant delete on table "public"."map_jitter_salts" to "service_role";

grant insert on table "public"."map_jitter_salts" to "service_role";

grant select on table "public"."map_jitter_salts" to "service_role";

grant update on table "public"."map_jitter_salts" to "service_role";


  create policy "Map editors can read the map jitter salt"
  on "public"."map_jitter_salts"
  as permissive
  for select
  to authenticated
using (public.util__auth_user_can_update_resource('map'::public.resource_type, map_id));


CREATE TRIGGER tr__maps__create_jitter_salt AFTER INSERT ON public.maps FOR EACH ROW EXECUTE FUNCTION public.map_jitter_salts__create_for_map();



-- Privileges that `supabase db diff` cannot see: default, schema, column,
-- and view grants. Appended by `pnpm db:new-migration` from what
-- `supabase/schemas/` declares. Do not hand-edit; re-run the command.
revoke all privileges on function public.map_jitter_salts__create_for_map() from public, anon, authenticated, service_role;
revoke all privileges on function public.rpc_maps__get_or_create_jitter_salt(p_map_id uuid) from public, anon, authenticated, service_role;
grant EXECUTE on function public.rpc_maps__get_or_create_jitter_salt(p_map_id uuid) to "authenticated";
