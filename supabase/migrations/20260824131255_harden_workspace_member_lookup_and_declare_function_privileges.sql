drop policy "Users with editor access can update dashboards" on "public"."dashboards";

drop policy "Users with editor access can update datasets" on "public"."datasets";

drop policy "Users with editor access can update maps" on "public"."maps";

drop policy "User can UPDATE workspaces they admin" on "public"."workspaces";

drop function if exists "public"."util__get_workspace_members"(workspace_id uuid);

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.util__is_workspace_member(p_workspace_id uuid, p_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.workspace_memberships wm
    where
      wm.workspace_id = p_workspace_id and
      wm.user_id = p_user_id
  );
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_resources__make_private(p_resource_type public.resource_type, p_resource_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_owner_id uuid;
  v_workspace_id uuid;
begin
  -- `for update` on an RLS table also applies the UPDATE policy's USING
  -- clause, not just the SELECT policy. The owner satisfies both.
  if p_resource_type = 'dashboard' then
    select d.owner_id, d.workspace_id
    into v_owner_id, v_workspace_id
    from public.dashboards d
    where d.id = p_resource_id
    for update;
  elsif p_resource_type = 'dataset' then
    select ds.owner_id, ds.workspace_id
    into v_owner_id, v_workspace_id
    from public.datasets ds
    where ds.id = p_resource_id
    for update;
  elsif p_resource_type = 'map' then
    select m.owner_id, m.workspace_id
    into v_owner_id, v_workspace_id
    from public.maps m
    where m.id = p_resource_id
    for update;
  else
    raise exception 'unsupported resource type: %', p_resource_type;
  end if;

  -- `is distinct from`, not `<>`. With a null auth.uid() (an unauthenticated or
  -- service-role caller) `v_owner_id <> auth.uid()` evaluates to null, the `if`
  -- would not fire, and execution would fall through to the DELETE with no gate
  -- at all. `is distinct from` is null-safe and refuses.
  if v_owner_id is null or v_owner_id is distinct from auth.uid () then
    raise exception 'insufficient_privilege'
      using errcode = '42501';
  end if;

  -- Shares first, restriction second. Not load-bearing while this is
  -- owner-only, because the owner short-circuit does not read is_restricted.
  -- Written this way so that if the gate is ever widened past the owner,
  -- restricting first cannot revoke the caller's own DELETE rights midway.
  delete from public.resource_shares rs
  where
    rs.resource_type = p_resource_type and
    rs.resource_id = p_resource_id and
    rs.workspace_id = v_workspace_id and
    (
      rs.principal_type <> 'user'::public.share_principal_type or
      rs.principal_id is distinct from v_owner_id
    );

  if p_resource_type = 'dashboard' then
    update public.dashboards
       set is_restricted = true
     where id = p_resource_id;
  elsif p_resource_type = 'dataset' then
    update public.datasets
       set is_restricted = true
     where id = p_resource_id;
  else
    update public.maps
       set is_restricted = true
     where id = p_resource_id;
  end if;

  -- The DELETE above is RLS-filtered. If a policy silently skipped a row, this
  -- would return success on a still-shared resource, which is the exact
  -- failure mode the function exists to remove. Raise so the whole transaction
  -- rolls back rather than half-landing. Purely a tripwire: no known
  -- configuration reaches it in production.
  -- rpc_resources__make_private_rollback.test.sql provokes it by injecting a
  -- restrictive DELETE policy, which proves the raise really does undo both
  -- the surviving DELETE and the is_restricted UPDATE.
  --
  -- Repeats util__has_non_owner_share's predicate rather than calling it.
  -- Execute on that helper is revoked from `authenticated` precisely so it
  -- cannot be used as a "does this resource have shares" probe, and this
  -- function is SECURITY INVOKER, so it could not call the helper unless
  -- execute were granted back to `authenticated`, which would re-open exactly
  -- the probe the revoke exists to close. Reading through the caller's own RLS
  -- loses nothing here: the resource_shares SELECT policy shows a workspace
  -- member every share row in their workspace, so no surviving share on their
  -- own resource can hide from this check.
  if exists (
    select 1
    from public.resource_shares rs
    where
      rs.resource_type = p_resource_type and
      rs.resource_id = p_resource_id and
      rs.workspace_id = v_workspace_id and
      (
        rs.principal_type <> 'user'::public.share_principal_type or
        rs.principal_id is distinct from v_owner_id
      )
  ) then
    raise exception 'make_private_incomplete';
  end if;
end;
$function$
;


  create policy "Users with editor access can update dashboards"
  on "public"."dashboards"
  as permissive
  for update
  to authenticated
using ((public.util__auth_user_can_update_resource('dashboard'::public.resource_type, id) AND ((snapshot_transition_kind IS DISTINCT FROM 'delete'::public.dashboard_snapshot_transition_kind) OR public.util__auth_user_can_delete_resource('dashboard'::public.resource_type, id))))
with check ((public.util__auth_user_can_update_resource('dashboard'::public.resource_type, id) AND ((snapshot_transition_kind IS DISTINCT FROM 'delete'::public.dashboard_snapshot_transition_kind) OR public.util__auth_user_can_delete_resource('dashboard'::public.resource_type, id)) AND public.util__is_workspace_member(workspace_id, owner_id)));



  create policy "Users with editor access can update datasets"
  on "public"."datasets"
  as permissive
  for update
  to authenticated
using (public.util__auth_user_can_update_resource('dataset'::public.resource_type, id))
with check ((public.util__auth_user_can_update_resource('dataset'::public.resource_type, id) AND public.util__is_workspace_member(workspace_id, owner_id)));



  create policy "Users with editor access can update maps"
  on "public"."maps"
  as permissive
  for update
  to authenticated
using (public.util__auth_user_can_update_resource('map'::public.resource_type, id))
with check ((public.util__auth_user_can_update_resource('map'::public.resource_type, id) AND public.maps__owner_id_matches_stored(id, owner_id) AND public.util__is_workspace_member(workspace_id, owner_id)));



  create policy "User can UPDATE workspaces they admin"
  on "public"."workspaces"
  as permissive
  for update
  to authenticated
using (public.util__can_manage_workspace_settings(id))
with check (public.util__is_workspace_member(id, owner_id));




-- Privileges that `supabase db diff` cannot see: default, schema, column,
-- and view grants. Appended by `pnpm db:new-migration` from what
-- `supabase/schemas/` declares. Do not hand-edit; re-run the command.
revoke all privileges on function public.concept_attributes__validate_label_and_identifiers() from public, anon, authenticated, service_role;
revoke all privileges on function public.dashboards__log_deleted_analytics_event() from public, anon, authenticated, service_role;
revoke all privileges on function public.dashboards__prevent_workspace_id_change() from public, anon, authenticated, service_role;
revoke all privileges on function public.datasets__log_deleted_analytics_event() from public, anon, authenticated, service_role;
revoke all privileges on function public.datasets__prevent_workspace_id_change() from public, anon, authenticated, service_role;
revoke all privileges on function public.maps__prevent_workspace_id_change() from public, anon, authenticated, service_role;
revoke all privileges on function public.resource_shares__validate_principal_workspace() from public, anon, authenticated, service_role;
revoke all privileges on function public.resource_shares__validate_resource_workspace() from public, anon, authenticated, service_role;
revoke all privileges on function public.rpc_datasets__add_csv_file_dataset(p_dataset_id uuid, p_workspace_id uuid, p_dataset_name text, p_dataset_description text, p_columns dataset_column_input[], p_is_in_cloud_storage boolean, p_size_in_bytes bigint, p_rows_to_skip integer, p_quote_char util__nullable_text, p_escape_char util__nullable_text, p_delimiter text, p_newline_delimiter text, p_comment_char util__nullable_text, p_has_header boolean, p_date_format datasets__csv_file__date_format) from public, anon, authenticated, service_role;
grant EXECUTE on function public.rpc_datasets__add_csv_file_dataset(p_dataset_id uuid, p_workspace_id uuid, p_dataset_name text, p_dataset_description text, p_columns dataset_column_input[], p_is_in_cloud_storage boolean, p_size_in_bytes bigint, p_rows_to_skip integer, p_quote_char util__nullable_text, p_escape_char util__nullable_text, p_delimiter text, p_newline_delimiter text, p_comment_char util__nullable_text, p_has_header boolean, p_date_format datasets__csv_file__date_format) to "authenticated";
revoke all privileges on function public.rpc_datasets__add_dataset(p_dataset_id uuid, p_workspace_id uuid, p_dataset_name text, p_dataset_description text, p_dataset_source_type datasets__source_type, p_columns dataset_column_input[]) from public, anon, authenticated, service_role;
grant EXECUTE on function public.rpc_datasets__add_dataset(p_dataset_id uuid, p_workspace_id uuid, p_dataset_name text, p_dataset_description text, p_dataset_source_type datasets__source_type, p_columns dataset_column_input[]) to "authenticated";
revoke all privileges on function public.rpc_datasets__add_google_sheets_dataset(p_dataset_id uuid, p_workspace_id uuid, p_dataset_name text, p_dataset_description text, p_columns dataset_column_input[], p_google_account_id text, p_google_document_id text, p_rows_to_skip integer, p_sheet_name util__nullable_text) from public, anon, authenticated, service_role;
grant EXECUTE on function public.rpc_datasets__add_google_sheets_dataset(p_dataset_id uuid, p_workspace_id uuid, p_dataset_name text, p_dataset_description text, p_columns dataset_column_input[], p_google_account_id text, p_google_document_id text, p_rows_to_skip integer, p_sheet_name util__nullable_text) to "authenticated";
revoke all privileges on function public.rpc_datasets__add_open_data_dataset(p_dataset_id uuid, p_workspace_id uuid, p_dataset_name text, p_dataset_description text, p_catalog_entry_id uuid, p_columns dataset_column_input[]) from public, anon, authenticated, service_role;
grant EXECUTE on function public.rpc_datasets__add_open_data_dataset(p_dataset_id uuid, p_workspace_id uuid, p_dataset_name text, p_dataset_description text, p_catalog_entry_id uuid, p_columns dataset_column_input[]) to "authenticated";
revoke all privileges on function public.rpc_datasets__add_virtual_dataset(p_dataset_id uuid, p_workspace_id uuid, p_dataset_name text, p_dataset_description text, p_columns dataset_column_input[], p_raw_sql text) from public, anon, authenticated, service_role;
grant EXECUTE on function public.rpc_datasets__add_virtual_dataset(p_dataset_id uuid, p_workspace_id uuid, p_dataset_name text, p_dataset_description text, p_columns dataset_column_input[], p_raw_sql text) to "authenticated";
revoke all privileges on function public.rpc_datasets__add_xlsx_file_dataset(p_dataset_id uuid, p_workspace_id uuid, p_dataset_name text, p_dataset_description text, p_columns dataset_column_input[], p_is_in_cloud_storage boolean, p_size_in_bytes bigint, p_rows_to_skip integer, p_sheet_name util__nullable_text, p_has_header boolean, p_date_format datasets__csv_file__date_format) from public, anon, authenticated, service_role;
grant EXECUTE on function public.rpc_datasets__add_xlsx_file_dataset(p_dataset_id uuid, p_workspace_id uuid, p_dataset_name text, p_dataset_description text, p_columns dataset_column_input[], p_is_in_cloud_storage boolean, p_size_in_bytes bigint, p_rows_to_skip integer, p_sheet_name util__nullable_text, p_has_header boolean, p_date_format datasets__csv_file__date_format) to "authenticated";
revoke all privileges on function public.rpc_workspaces__create_with_owner(p_workspace_name text, p_workspace_slug text, p_full_name text, p_display_name text) from public, anon, authenticated, service_role;
grant EXECUTE on function public.rpc_workspaces__create_with_owner(p_workspace_name text, p_workspace_slug text, p_full_name text, p_display_name text) to "authenticated";
revoke all privileges on function public.tr_workspaces__seed_builtin_role_groups() from public, anon, authenticated, service_role;
revoke all privileges on function public.usage_analytics_events__set_category() from public, anon, authenticated, service_role;
revoke all privileges on function public.user_group_memberships__cleanup_on_workspace_member_removed() from public, anon, authenticated, service_role;
revoke all privileges on function public.user_profiles__prevent_id_changes() from public, anon, authenticated, service_role;
revoke all privileges on function public.util__analytics_event_category(p_event_name text) from public, anon, authenticated, service_role;
grant EXECUTE on function public.util__analytics_event_category(p_event_name text) to "authenticated";
grant EXECUTE on function public.util__analytics_event_category(p_event_name text) to "service_role";
revoke all privileges on function public.util__auth_user_can_access_resource_in_workspace(p_resource_type resource_type, p_resource_id uuid, p_workspace_id uuid, p_required_role role_level) from public, anon, authenticated, service_role;
grant EXECUTE on function public.util__auth_user_can_access_resource_in_workspace(p_resource_type resource_type, p_resource_id uuid, p_workspace_id uuid, p_required_role role_level) to "authenticated";
revoke all privileges on function public.util__auth_user_can_access_resource(p_resource_type resource_type, p_resource_id uuid, p_min_role role_level) from public, anon, authenticated, service_role;
grant EXECUTE on function public.util__auth_user_can_access_resource(p_resource_type resource_type, p_resource_id uuid, p_min_role role_level) to "authenticated";
revoke all privileges on function public.util__auth_user_can_delete_resource(p_resource_type resource_type, p_resource_id uuid) from public, anon, authenticated, service_role;
grant EXECUTE on function public.util__auth_user_can_delete_resource(p_resource_type resource_type, p_resource_id uuid) to "authenticated";
revoke all privileges on function public.util__auth_user_can_insert_workspace_resource(p_workspace_id uuid, p_resource_type resource_type, p_owner_id uuid) from public, anon, authenticated, service_role;
grant EXECUTE on function public.util__auth_user_can_insert_workspace_resource(p_workspace_id uuid, p_resource_type resource_type, p_owner_id uuid) to "authenticated";
revoke all privileges on function public.util__auth_user_can_update_resource(p_resource_type resource_type, p_resource_id uuid) from public, anon, authenticated, service_role;
grant EXECUTE on function public.util__auth_user_can_update_resource(p_resource_type resource_type, p_resource_id uuid) to "authenticated";
revoke all privileges on function public.util__auth_user_may_select_dashboard(p_dashboard_id uuid) from public, anon, authenticated, service_role;
grant EXECUTE on function public.util__auth_user_may_select_dashboard(p_dashboard_id uuid) to "authenticated";
revoke all privileges on function public.util__auth_user_may_select_dataset(p_dataset_id uuid) from public, anon, authenticated, service_role;
grant EXECUTE on function public.util__auth_user_may_select_dataset(p_dataset_id uuid) to "authenticated";
revoke all privileges on function public.util__auth_user_meets_min_app_role(p_workspace_id uuid, p_app app_type, p_min_role role_level) from public, anon, authenticated, service_role;
grant EXECUTE on function public.util__auth_user_meets_min_app_role(p_workspace_id uuid, p_app app_type, p_min_role role_level) to "authenticated";
revoke all privileges on function public.util__can_manage_workspace_settings(p_workspace_id uuid) from public, anon, authenticated, service_role;
grant EXECUTE on function public.util__can_manage_workspace_settings(p_workspace_id uuid) to "authenticated";
revoke all privileges on function public.util__email_domain(p_email text) from public, anon, authenticated, service_role;
revoke all privileges on function public.util__get_auth_user_app_role(p_workspace_id uuid, p_app app_type) from public, anon, authenticated, service_role;
revoke all privileges on function public.util__get_auth_user_owned_workspaces() from public, anon, authenticated, service_role;
grant EXECUTE on function public.util__get_auth_user_owned_workspaces() to "authenticated";
revoke all privileges on function public.util__get_auth_user_user_group_ids(p_workspace_id uuid) from public, anon, authenticated, service_role;
revoke all privileges on function public.util__get_auth_user_workspaces() from public, anon, authenticated, service_role;
grant EXECUTE on function public.util__get_auth_user_workspaces() to "authenticated";
revoke all privileges on function public.util__is_settings_admin(p_workspace_id uuid) from public, anon, authenticated, service_role;
grant EXECUTE on function public.util__is_settings_admin(p_workspace_id uuid) to "authenticated";
revoke all privileges on function public.util__is_workspace_member(p_workspace_id uuid, p_user_id uuid) from public, anon, authenticated, service_role;
grant EXECUTE on function public.util__is_workspace_member(p_workspace_id uuid, p_user_id uuid) to "authenticated";
revoke all privileges on function public.util__rank_to_role_level(p_rank integer) from public, anon, authenticated, service_role;
revoke all privileges on function public.util__resource_effective_role(p_resource_type resource_type, p_resource_id uuid) from public, anon, authenticated, service_role;
grant EXECUTE on function public.util__resource_effective_role(p_resource_type resource_type, p_resource_id uuid) to "authenticated";
revoke all privileges on function public.util__resource_type_to_app_type(p_resource_type resource_type) from public, anon, authenticated, service_role;
revoke all privileges on function public.util__role_level_rank(p_role role_level) from public, anon, authenticated, service_role;
revoke all privileges on function public.util__set_updated_at() from public, anon, authenticated, service_role;
revoke all privileges on function public.util__storage_object_dashboard_id(p_object_name text) from public, anon, authenticated, service_role;
grant EXECUTE on function public.util__storage_object_dashboard_id(p_object_name text) to "anon";
grant EXECUTE on function public.util__storage_object_dashboard_id(p_object_name text) to "authenticated";
revoke all privileges on function public.util__storage_object_dataset_id(p_object_name text) from public, anon, authenticated, service_role;
grant EXECUTE on function public.util__storage_object_dataset_id(p_object_name text) to "authenticated";
revoke all privileges on function public.util__storage_object_snapshot_revision(p_object_name text) from public, anon, authenticated, service_role;
grant EXECUTE on function public.util__storage_object_snapshot_revision(p_object_name text) to "anon";
grant EXECUTE on function public.util__storage_object_snapshot_revision(p_object_name text) to "authenticated";
revoke all privileges on function public.util__storage_object_workspace_id(p_object_name text) from public, anon, authenticated, service_role;
grant EXECUTE on function public.util__storage_object_workspace_id(p_object_name text) to "authenticated";
revoke all privileges on function public.util__subscription_plan_rank(p_plan subscriptions__feature_plan_type) from public, anon, authenticated, service_role;
