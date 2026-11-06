set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.rpc_workspaces__is_slug_available(p_workspace_slug text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select coalesce(
    p_workspace_slug ~ '^[a-zA-Z0-9-]{3,20}$' and
    not exists (
      select 1
      from public.workspaces w
      where w.slug = p_workspace_slug
    ),
    false
  );
$function$
;


-- Privileges that `supabase db diff` cannot see: default, schema, column,
-- and view grants. Appended by `pnpm db:new-migration` from what
-- `supabase/schemas/` declares. Do not hand-edit; re-run the command.
revoke all privileges on function public.rpc_workspaces__is_slug_available(p_workspace_slug text) from public, anon, authenticated, service_role;
grant EXECUTE on function public.rpc_workspaces__is_slug_available(p_workspace_slug text) to "authenticated";
