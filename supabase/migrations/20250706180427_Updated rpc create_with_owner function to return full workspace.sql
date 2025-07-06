set check_function_bodies = off;

DROP FUNCTION public.rpc_workspaces__create_with_owner(text, text, text, text);

CREATE OR REPLACE FUNCTION public.rpc_workspaces__create_with_owner(p_workspace_name text, p_workspace_slug text, p_full_name text, p_display_name text)
 RETURNS workspaces
 LANGUAGE plpgsql
AS $function$
  declare
    v_owner_id uuid := auth.uid();
    v_workspace public.workspaces;
  begin
    -- Create the workspace
    insert into public.workspaces (owner_id, name, slug)
      values (v_owner_id, p_workspace_name, p_workspace_slug)
      returning * into v_workspace;

    -- Call the rpc function to create the workspace membership and user profile
    perform public.rpc_workspaces__add_user(
      v_workspace.id,
      v_owner_id,
      p_full_name,
      p_display_name,
      'admin'
    );

    return v_workspace;
  end;
$function$
;


