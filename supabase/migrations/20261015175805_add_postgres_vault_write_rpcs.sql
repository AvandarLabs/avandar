set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.rpc_db_connections__create_vault_secret(p_secret text, p_name text, p_description text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'vault'
AS $function$
declare
  v_secret_id uuid;
begin
  v_secret_id := vault.create_secret(p_secret, p_name, p_description);
  return v_secret_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_db_connections__update_vault_secret(p_secret_id uuid, p_new_secret text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'vault'
AS $function$
begin
  perform vault.update_secret(p_secret_id, p_new_secret);
end;
$function$
;


-- Privileges that `supabase db diff` cannot see: default, schema, column,
-- and view grants. Appended by `pnpm db:new-migration` from what
-- `supabase/schemas/` declares. Do not hand-edit; re-run the command.
revoke all privileges on function public.rpc_db_connections__create_vault_secret(p_secret text, p_name text, p_description text) from public, anon, authenticated, service_role;
grant EXECUTE on function public.rpc_db_connections__create_vault_secret(p_secret text, p_name text, p_description text) to "service_role";
revoke all privileges on function public.rpc_db_connections__update_vault_secret(p_secret_id uuid, p_new_secret text) from public, anon, authenticated, service_role;
grant EXECUTE on function public.rpc_db_connections__update_vault_secret(p_secret_id uuid, p_new_secret text) to "service_role";
