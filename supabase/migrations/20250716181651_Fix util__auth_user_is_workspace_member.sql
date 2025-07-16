set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.util__auth_user_is_workspace_admin(workspace_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
  begin
    return exists (
      select 1 from public.workspace_memberships
        join public.user_roles on workspace_memberships.id = user_roles.membership_id
      where workspace_memberships.workspace_id = $1
        and workspace_memberships.user_id = auth.uid()
        and user_roles.role = 'admin'
    );
  end;
$function$
;


