drop policy "Users with admin access can delete dashboards" on "public"."dashboards";

drop policy "Users with editor access can update dashboards" on "public"."dashboards";

drop policy "Users with editor app role can insert dashboards" on "public"."dashboards";

alter table "public"."dashboards"
drop constraint "dashboards__snapshot_transition_consistent";

alter table "public"."dashboards"
add constraint "dashboards__snapshot_transition_consistent" check (
  (
    (
      (
        snapshot_transition_kind is null
      ) and
      (
        snapshot_transition_revision is null
      ) and
      (
        snapshot_transition_prior_revision is null
      ) and
      (
        snapshot_transition_prior_visibility is null
      ) and
      (
        snapshot_transition_target_visibility is null
      )
    ) or
    (
      (
        snapshot_transition_kind is not null
      ) and
      (
        snapshot_transition_revision is not null
      ) and
      (
        snapshot_transition_revision <> '00000000-0000-0000-0000-000000000000'::uuid
      ) and
      (
        snapshot_transition_revision is distinct from snapshot_revision
      ) and
      (
        snapshot_transition_prior_visibility is not null
      ) and
      (
        (
          (
            snapshot_transition_kind = any (
              array[
                'publish'::public.dashboard_snapshot_transition_kind,
                'abort_publish'::public.dashboard_snapshot_transition_kind
              ]
            )
          ) and
          (
            snapshot_transition_target_visibility = any (
              array[
                'workspace'::public.dashboard_visibility,
                'public'::public.dashboard_visibility
              ]
            )
          ) and
          (
            visibility = snapshot_transition_prior_visibility
          ) and
          (
            not (
              snapshot_revision is distinct from snapshot_transition_prior_revision
            )
          )
        ) or
        (
          (
            snapshot_transition_kind = any (
              array[
                'unpublish'::public.dashboard_snapshot_transition_kind,
                'delete'::public.dashboard_snapshot_transition_kind
              ]
            )
          ) and
          (
            snapshot_transition_target_visibility is null
          ) and
          (
            visibility = 'draft'::public.dashboard_visibility
          ) and
          (
            not (
              snapshot_revision is distinct from snapshot_transition_prior_revision
            )
          )
        )
      )
    )
  )
) not valid;

alter table "public"."dashboards" validate constraint "dashboards__snapshot_transition_consistent";

set
  check_function_bodies = off;

create or replace function private.dashboards__snapshot_claim_is_valid (
  p_old_dashboard public.dashboards,
  p_new_dashboard public.dashboards
) returns boolean language sql immutable
set
  search_path to '' as $function$
  select
    (p_old_dashboard).snapshot_transition_kind is null and
    (p_new_dashboard).snapshot_transition_kind is not null and
    (p_new_dashboard).snapshot_transition_revision is not null and
    (p_new_dashboard).snapshot_transition_revision <>
      '00000000-0000-0000-0000-000000000000'::uuid and
    (p_new_dashboard).snapshot_transition_revision is distinct from
      (p_old_dashboard).snapshot_revision and
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
$function$;

create or replace function private.util__auth_user_can_delete_dashboard_snapshot_object (
  p_bucket_id text,
  p_object_name text
) returns boolean language sql stable security definer
set
  search_path to '' as $function$
  select coalesce(
    exists (
      select 1
      from public.dashboards
      where
        dashboards.id = public.util__storage_object_dashboard_id (
          p_object_name
        ) and
        case dashboards.snapshot_transition_kind
          when 'delete' then
            public.util__auth_user_can_delete_resource (
              'dashboard'::public.resource_type,
              dashboards.id
            )
          else
            public.util__auth_user_can_update_resource (
              'dashboard'::public.resource_type,
              dashboards.id
            )
        end and
        case dashboards.snapshot_transition_kind
          when 'unpublish' then true
          when 'delete' then true
          when 'abort_publish' then
            dashboards.snapshot_transition_revision =
              public.util__storage_object_snapshot_revision (p_object_name) and
            (
              (
                dashboards.snapshot_transition_target_visibility = 'public' and
                p_bucket_id = 'published'
              ) or (
                dashboards.snapshot_transition_target_visibility = 'workspace' and
                p_bucket_id = 'published-private'
              )
            )
          when 'publish' then
            dashboards.snapshot_revision is distinct from
              public.util__storage_object_snapshot_revision (p_object_name) and
            dashboards.snapshot_transition_revision is distinct from
              public.util__storage_object_snapshot_revision (p_object_name)
          else
            dashboards.snapshot_revision is distinct from
              public.util__storage_object_snapshot_revision (p_object_name)
        end
    ),
    false
  );
$function$;

create policy "Users with admin access can delete dashboards" on "public"."dashboards" as permissive for delete to authenticated using (
  (
    public.util__auth_user_can_delete_resource (
      'dashboard'::public.resource_type,
      id
    ) and
    (
      snapshot_transition_kind = 'delete'::public.dashboard_snapshot_transition_kind
    ) and
    (
      snapshot_transition_revision is not null
    ) and
    (
      snapshot_transition_revision <> '00000000-0000-0000-0000-000000000000'::uuid
    ) and
    (
      snapshot_transition_revision is distinct from snapshot_revision
    ) and
    (
      snapshot_transition_target_visibility is null
    ) and
    (
      snapshot_transition_prior_visibility is not null
    ) and
    (
      visibility = 'draft'::public.dashboard_visibility
    ) and
    (
      not (
        snapshot_revision is distinct from snapshot_transition_prior_revision
      )
    )
  )
);

create policy "Users with editor access can update dashboards" on "public"."dashboards" as permissive
for update
  to authenticated using (
    (
      public.util__auth_user_can_update_resource (
        'dashboard'::public.resource_type,
        id
      ) and
      (
        (
          snapshot_transition_kind is distinct from 'delete'::public.dashboard_snapshot_transition_kind
        ) or
        public.util__auth_user_can_delete_resource (
          'dashboard'::public.resource_type,
          id
        )
      )
    )
  )
with
  check (
    (
      public.util__auth_user_can_update_resource (
        'dashboard'::public.resource_type,
        id
      ) and
      (
        (
          snapshot_transition_kind is distinct from 'delete'::public.dashboard_snapshot_transition_kind
        ) or
        public.util__auth_user_can_delete_resource (
          'dashboard'::public.resource_type,
          id
        )
      ) and
      (
        owner_id = any (
          array(
            select
              public.util__get_workspace_members (
                dashboards.workspace_id
              ) as util__get_workspace_members
          )
        )
      )
    )
  );

create policy "Users with editor app role can insert dashboards" on "public"."dashboards" as permissive for insert to authenticated
with
  check (
    (
      public.util__auth_user_can_insert_workspace_resource (
        workspace_id,
        'dashboard'::public.resource_type,
        owner_id
      ) and
      (
        snapshot_transition_kind is null
      )
    )
  );
