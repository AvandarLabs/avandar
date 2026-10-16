drop function if exists "public"."rpc_connections__get_decrypted_secret"(p_vault_secret_id uuid);

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.rpc_connections__get_decrypted_secret(p_vault_secret_id uuid, p_workspace_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'vault'
AS $function$
declare
  v_secret text;
begin
  if not exists (
    select 1
    from public.connections__postgres
    where vault_secret_id = p_vault_secret_id
      and workspace_id = p_workspace_id
  ) then
    return null;
  end if;

  select decrypted_secret into v_secret
  from vault.decrypted_secrets
  where id = p_vault_secret_id;

  return v_secret;
end;
$function$
;


-- Privileges that `supabase db diff` cannot see: default, schema, column,
-- and view grants. Appended by `pnpm db:new-migration` from what
-- `supabase/schemas/` declares. Do not hand-edit; re-run the command.
revoke all privileges on function public.rpc_connections__get_decrypted_secret(p_vault_secret_id uuid, p_workspace_id uuid) from public, anon, authenticated, service_role;
grant EXECUTE on function public.rpc_connections__get_decrypted_secret(p_vault_secret_id uuid, p_workspace_id uuid) to "service_role";
