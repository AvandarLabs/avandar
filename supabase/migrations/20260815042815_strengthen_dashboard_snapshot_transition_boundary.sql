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
        snapshot_transition_prior_visibility is not null
      ) and
      (
        (
          (
            snapshot_transition_kind = 'publish'::public.dashboard_snapshot_transition_kind
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
