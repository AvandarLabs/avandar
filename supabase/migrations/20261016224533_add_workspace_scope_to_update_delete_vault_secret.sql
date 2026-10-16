drop function if exists "public"."rpc_connections__delete_vault_secret"(p_secret_id uuid);

drop function if exists "public"."rpc_connections__update_vault_secret"(p_secret_id uuid, p_new_secret text);

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.rpc_connections__delete_vault_secret(p_secret_id uuid, p_workspace_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'vault'
AS $function$
begin
  if exists (
    select 1
    from public.connections__postgres
    where vault_secret_id = p_secret_id
      and workspace_id <> p_workspace_id
  ) then
    raise exception 'Secret % belongs to a connection in a different workspace', p_secret_id;
  end if;

  delete from vault.secrets where id = p_secret_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_connections__update_vault_secret(p_secret_id uuid, p_new_secret text, p_workspace_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'vault'
AS $function$
begin
  if not exists (
    select 1
    from public.connections__postgres
    where vault_secret_id = p_secret_id
      and workspace_id = p_workspace_id
  ) then
    raise exception 'Secret % does not belong to a connection in this workspace', p_secret_id;
  end if;

  perform vault.update_secret(p_secret_id, p_new_secret);
end;
$function$
;


-- Privileges that `supabase db diff` cannot see: default, schema, column,
-- and view grants. Appended by `pnpm db:new-migration` from what
-- `supabase/schemas/` declares. Do not hand-edit; re-run the command.
revoke all privileges on function public.rpc_connections__delete_vault_secret(p_secret_id uuid, p_workspace_id uuid) from public, anon, authenticated, service_role;
grant EXECUTE on function public.rpc_connections__delete_vault_secret(p_secret_id uuid, p_workspace_id uuid) to "service_role";
revoke all privileges on function public.rpc_connections__update_vault_secret(p_secret_id uuid, p_new_secret text, p_workspace_id uuid) from public, anon, authenticated, service_role;
grant EXECUTE on function public.rpc_connections__update_vault_secret(p_secret_id uuid, p_new_secret text, p_workspace_id uuid) to "service_role";
