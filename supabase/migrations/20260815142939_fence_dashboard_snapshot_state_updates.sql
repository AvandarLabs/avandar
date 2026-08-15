set check_function_bodies = off;

CREATE OR REPLACE FUNCTION private.dashboards__snapshot_claim_is_valid(p_old_dashboard public.dashboards, p_new_dashboard public.dashboards)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select
    (p_old_dashboard).snapshot_transition_kind is null and
    (p_new_dashboard).snapshot_transition_kind is not null and
    (p_new_dashboard).snapshot_transition_revision is not null and
    (p_new_dashboard).snapshot_transition_prior_revision is not distinct from
      (p_old_dashboard).snapshot_revision and
    (p_new_dashboard).snapshot_transition_prior_visibility =
      (p_old_dashboard).visibility and
    (
      (
        (p_new_dashboard).snapshot_transition_kind = 'publish' and
        (p_new_dashboard).snapshot_transition_target_visibility in ('workspace', 'public') and
        (p_new_dashboard).visibility = (p_old_dashboard).visibility and
        (p_new_dashboard).snapshot_revision is not distinct from
          (p_old_dashboard).snapshot_revision
      ) or (
        (p_new_dashboard).snapshot_transition_kind in ('unpublish', 'delete') and
        (p_new_dashboard).snapshot_transition_target_visibility is null and
        (p_new_dashboard).visibility = 'draft' and
        (p_new_dashboard).snapshot_revision is not distinct from
          (p_old_dashboard).snapshot_revision
      )
    );
$function$
;

CREATE OR REPLACE FUNCTION private.dashboards__snapshot_progress_is_valid(p_old_dashboard public.dashboards, p_new_dashboard public.dashboards)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select
    (p_old_dashboard).snapshot_transition_kind is not null and
    (
      private.dashboards__snapshot_state_is_unchanged (
        p_old_dashboard,
        p_new_dashboard
      ) or (
        (p_old_dashboard).snapshot_transition_kind = 'publish' and
        (p_new_dashboard).snapshot_transition_kind = 'abort_publish' and
        row(
          (p_new_dashboard).visibility,
          (p_new_dashboard).snapshot_revision,
          (p_new_dashboard).snapshot_transition_revision,
          (p_new_dashboard).snapshot_transition_prior_revision,
          (p_new_dashboard).snapshot_transition_prior_visibility,
          (p_new_dashboard).snapshot_transition_target_visibility
        ) is not distinct from row(
          (p_old_dashboard).visibility,
          (p_old_dashboard).snapshot_revision,
          (p_old_dashboard).snapshot_transition_revision,
          (p_old_dashboard).snapshot_transition_prior_revision,
          (p_old_dashboard).snapshot_transition_prior_visibility,
          (p_old_dashboard).snapshot_transition_target_visibility
        )
      ) or (
        (p_new_dashboard).snapshot_transition_kind is null and
        (p_new_dashboard).snapshot_transition_revision is null and
        (p_new_dashboard).snapshot_transition_prior_revision is null and
        (p_new_dashboard).snapshot_transition_prior_visibility is null and
        (p_new_dashboard).snapshot_transition_target_visibility is null and
        private.dashboards__snapshot_settlement_is_valid (
          p_old_dashboard,
          p_new_dashboard
        )
      )
    );
$function$
;

CREATE OR REPLACE FUNCTION private.dashboards__snapshot_settlement_is_valid(p_old_dashboard public.dashboards, p_new_dashboard public.dashboards)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select
    (
      (p_old_dashboard).snapshot_transition_kind = 'publish' and
      (p_new_dashboard).visibility =
        (p_old_dashboard).snapshot_transition_target_visibility and
      (p_new_dashboard).snapshot_revision =
        (p_old_dashboard).snapshot_transition_revision
    ) or (
      (p_old_dashboard).snapshot_transition_kind = 'abort_publish' and
      (p_new_dashboard).visibility =
        (p_old_dashboard).snapshot_transition_prior_visibility and
      (p_new_dashboard).snapshot_revision is not distinct from
        (p_old_dashboard).snapshot_transition_prior_revision
    ) or (
      (p_old_dashboard).snapshot_transition_kind = 'unpublish' and
      (p_new_dashboard).visibility = 'draft' and
      (p_new_dashboard).snapshot_revision is null
    );
$function$
;

CREATE OR REPLACE FUNCTION private.dashboards__snapshot_state_is_unchanged(p_old_dashboard public.dashboards, p_new_dashboard public.dashboards)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select row(
    (p_old_dashboard).visibility,
    (p_old_dashboard).snapshot_revision,
    (p_old_dashboard).snapshot_transition_kind,
    (p_old_dashboard).snapshot_transition_revision,
    (p_old_dashboard).snapshot_transition_prior_revision,
    (p_old_dashboard).snapshot_transition_prior_visibility,
    (p_old_dashboard).snapshot_transition_target_visibility
  ) is not distinct from row(
    (p_new_dashboard).visibility,
    (p_new_dashboard).snapshot_revision,
    (p_new_dashboard).snapshot_transition_kind,
    (p_new_dashboard).snapshot_transition_revision,
    (p_new_dashboard).snapshot_transition_prior_revision,
    (p_new_dashboard).snapshot_transition_prior_visibility,
    (p_new_dashboard).snapshot_transition_target_visibility
  );
$function$
;

CREATE OR REPLACE FUNCTION private.dashboards__validate_snapshot_transition_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if
    private.dashboards__snapshot_state_is_unchanged (old, new) or
    private.dashboards__snapshot_claim_is_valid (old, new) or
    private.dashboards__snapshot_progress_is_valid (old, new)
  then
    return new;
  end if;

  raise exception 'illegal dashboard snapshot transition'
    using errcode = '23514';
end;
$function$
;

CREATE TRIGGER tr__dashboards__validate_snapshot_transition_update BEFORE UPDATE OF visibility, snapshot_revision, snapshot_transition_kind, snapshot_transition_revision, snapshot_transition_prior_revision, snapshot_transition_prior_visibility, snapshot_transition_target_visibility ON public.dashboards FOR EACH ROW EXECUTE FUNCTION private.dashboards__validate_snapshot_transition_update();

revoke all on function private.dashboards__snapshot_state_is_unchanged (
  public.dashboards,
  public.dashboards
) from public, anon, authenticated, service_role;

revoke all on function private.dashboards__snapshot_claim_is_valid (
  public.dashboards,
  public.dashboards
) from public, anon, authenticated, service_role;

revoke all on function private.dashboards__snapshot_progress_is_valid (
  public.dashboards,
  public.dashboards
) from public, anon, authenticated, service_role;

revoke all on function private.dashboards__snapshot_settlement_is_valid (
  public.dashboards,
  public.dashboards
) from public, anon, authenticated, service_role;

revoke all on function private.dashboards__validate_snapshot_transition_update ()
from public, anon, authenticated, service_role;

