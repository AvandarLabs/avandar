drop policy "User can SELECT workspaces they belong to" on "public"."workspaces";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.rpc_workspaces__create_with_owner(p_workspace_name text, p_workspace_slug text, p_full_name text, p_display_name text)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
  declare
    v_owner_id uuid := auth.uid();
    v_workspace_id uuid;
  begin
    -- Create the workspace
    insert into public.workspaces (owner_id, name, slug)
      values (v_owner_id, p_workspace_name, p_workspace_slug)
      returning id into v_workspace_id;

    -- Call the rpc function to create the workspace membership and user profile
    perform public.rpc_workspaces__add_user(
      v_workspace_id,
      v_owner_id,
      p_full_name,
      p_display_name,
      'admin'
    );

    return v_workspace_id;
  end;
$function$
;

create policy "User can SELECT workspaces they own or belong to"
on "public"."workspaces"
as permissive
for select
to authenticated
using (((auth.uid() = owner_id) OR util__auth_user_is_workspace_member(id)));



