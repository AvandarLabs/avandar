create table "public"."usage_analytics_events" (
  "id" uuid not null default gen_random_uuid (),
  "workspace_id" uuid,
  "user_id" uuid,
  "event_name" text not null,
  "app" public.app_type,
  "payload" jsonb,
  "created_at" timestamptz not null default now()
);

alter table "public"."usage_analytics_events" enable row level security;

create unique index "usage_analytics_events_pkey" on public.usage_analytics_events using btree (id);

create index "usage_analytics_events__workspace_id__created_at_idx" on public.usage_analytics_events using btree (workspace_id, created_at desc);

create index "usage_analytics_events__event_name__created_at_idx" on public.usage_analytics_events using btree (event_name, created_at desc);

alter table "public"."usage_analytics_events" add constraint "usage_analytics_events_pkey" primary key using index "usage_analytics_events_pkey";

alter table "public"."usage_analytics_events" add constraint "usage_analytics_events_workspace_id_fkey" foreign key (workspace_id) references public.workspaces (id) on update cascade on delete cascade;

alter table "public"."usage_analytics_events" add constraint "usage_analytics_events_user_id_fkey" foreign key (user_id) references auth.users (id) on update cascade on delete set null;

grant delete on table "public"."usage_analytics_events" to "anon";
grant insert on table "public"."usage_analytics_events" to "anon";
grant references on table "public"."usage_analytics_events" to "anon";
grant select on table "public"."usage_analytics_events" to "anon";
grant trigger on table "public"."usage_analytics_events" to "anon";
grant truncate on table "public"."usage_analytics_events" to "anon";
grant update on table "public"."usage_analytics_events" to "anon";

grant delete on table "public"."usage_analytics_events" to "authenticated";
grant insert on table "public"."usage_analytics_events" to "authenticated";
grant references on table "public"."usage_analytics_events" to "authenticated";
grant select on table "public"."usage_analytics_events" to "authenticated";
grant trigger on table "public"."usage_analytics_events" to "authenticated";
grant truncate on table "public"."usage_analytics_events" to "authenticated";
grant update on table "public"."usage_analytics_events" to "authenticated";

grant delete on table "public"."usage_analytics_events" to "service_role";
grant insert on table "public"."usage_analytics_events" to "service_role";
grant references on table "public"."usage_analytics_events" to "service_role";
grant select on table "public"."usage_analytics_events" to "service_role";
grant trigger on table "public"."usage_analytics_events" to "service_role";
grant truncate on table "public"."usage_analytics_events" to "service_role";
grant update on table "public"."usage_analytics_events" to "service_role";

create policy "Authenticated users can INSERT analytics events for workspaces they belong to"
on "public"."usage_analytics_events"
as permissive
for insert
to authenticated
with check (
  (user_id is null or user_id = auth.uid())
  and (
    workspace_id is null
    or exists (
      select 1
      from public.workspace_memberships m
      where m.workspace_id = usage_analytics_events.workspace_id
        and m.user_id = auth.uid()
    )
  )
);

create policy "Workspace owners can SELECT analytics events for their workspaces"
on "public"."usage_analytics_events"
as permissive
for select
to authenticated
using (
  workspace_id is not null
  and exists (
    select 1 from public.workspaces w
    where w.id = usage_analytics_events.workspace_id
      and w.owner_id = auth.uid()
  )
);
