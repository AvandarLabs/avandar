set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.rpc_datasets__get_editable_ids(p_workspace_id uuid)
 RETURNS SETOF uuid
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select dataset.id
  from public.datasets dataset
  where
    dataset.workspace_id = p_workspace_id and
    public.util__auth_user_can_update_resource (
      'dataset'::public.resource_type,
      dataset.id
    );
$function$
;


-- Privileges that `supabase db diff` cannot see: default, schema, column,
-- and view grants. Appended by `pnpm db:new-migration` from what
-- `supabase/schemas/` declares. Do not hand-edit; re-run the command.
revoke all privileges on function public.rpc_datasets__get_editable_ids(p_workspace_id uuid) from public, anon, authenticated, service_role;
grant EXECUTE on function public.rpc_datasets__get_editable_ids(p_workspace_id uuid) to "authenticated";
