set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.rpc_db_connections__delete_vault_secret(p_secret_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'vault'
AS $function$
begin
  delete from vault.secrets where id = p_secret_id;
end;
$function$
;


-- Privileges that `supabase db diff` cannot see: default, schema, column,
-- and view grants. Appended by `pnpm db:new-migration` from what
-- `supabase/schemas/` declares. Do not hand-edit; re-run the command.
revoke all privileges on function public.rpc_db_connections__delete_vault_secret(p_secret_id uuid) from public, anon, authenticated, service_role;
grant EXECUTE on function public.rpc_db_connections__delete_vault_secret(p_secret_id uuid) to "service_role";
