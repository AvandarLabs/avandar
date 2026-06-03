drop policy "Authenticated users can INSERT analytics events for workspaces " on "public"."usage_analytics_events";

drop policy "Workspace owners can SELECT analytics events for their workspac" on "public"."usage_analytics_events";

drop function if exists "public"."rpc__list_shared_with_me" (
  p_workspace_id uuid
);

drop function if exists "public"."rpc_datasets__add_virtual_dataset" (
  p_dataset_id uuid,
  p_workspace_id uuid,
  p_dataset_name text,
  p_dataset_description text,
  p_columns public.dataset_column_input[],
  p_raw_sql text
);

alter table "public"."subscriptions"
add constraint "subscriptions_polar_subscription_id_key" unique using index "subscriptions_polar_subscription_id_key";

create policy "
  Authenticated users can INSERT analytics events for workspac" on "public"."usage_analytics_events" as permissive for insert to authenticated
with
  check (
    (
      (
        (
          user_id is null
        ) or
        (
          user_id = auth.uid ()
        )
      ) and
      (
        (
          workspace_id is null
        ) or
        (
          exists (
            select
              1
            from
              public.workspace_memberships m
            where
              (
                (
                  m.workspace_id = usage_analytics_events.workspace_id
                ) and
                (
                  m.user_id = auth.uid ()
                )
              )
          )
        )
      )
    )
  );

create policy "
  Workspace owners can SELECT analytics events for their works" on "public"."usage_analytics_events" as permissive for
select
  to authenticated using (
    (
      (
        workspace_id is not null
      ) and
      (
        exists (
          select
            1
          from
            public.workspaces w
          where
            (
              (
                w.id = usage_analytics_events.workspace_id
              ) and
              (
                w.owner_id = auth.uid ()
              )
            )
        )
      )
    )
  );
