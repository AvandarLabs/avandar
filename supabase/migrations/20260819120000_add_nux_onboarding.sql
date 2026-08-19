create type "public"."nux_status" as enum ('not_started', 'in_progress', 'completed', 'dismissed');

drop policy "Authenticated users can INSERT analytics events for workspaces " on "public"."usage_analytics_events";

  create table "public"."user_nux_progress" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "user_id" uuid not null default auth.uid(),
    "tutorial_key" text not null default 'first_dashboard'::text,
    "status" public.nux_status not null default 'not_started'::public.nux_status,
    "completed_milestones" text[] not null default '{}'::text[],
    "catch_up_suppressed" boolean not null default false
      );


alter table "public"."user_nux_progress" enable row level security;

CREATE INDEX idx_user_nux_progress__user_id ON public.user_nux_progress USING btree (user_id);

CREATE UNIQUE INDEX user_nux_progress__unique_user_tutorial ON public.user_nux_progress USING btree (user_id, tutorial_key);

CREATE UNIQUE INDEX user_nux_progress_pkey ON public.user_nux_progress USING btree (id);

alter table "public"."user_nux_progress" add constraint "user_nux_progress_pkey" PRIMARY KEY using index "user_nux_progress_pkey";

alter table "public"."user_nux_progress" add constraint "user_nux_progress__unique_user_tutorial" UNIQUE using index "user_nux_progress__unique_user_tutorial";

alter table "public"."user_nux_progress" add constraint "user_nux_progress_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."user_nux_progress" validate constraint "user_nux_progress_user_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.util__analytics_event_category(p_event_name text)
 RETURNS public.usage_analytics_events__category
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select (
    case p_event_name
      -- acquisition
      when 'user.registered' then 'acquisition'
      when 'user.email_confirmed' then 'acquisition'
      -- activation
      when 'workspace.created' then 'activation'
      when 'dataset.imported' then 'activation'
      when 'query.ran' then 'activation'
      when 'dashboard.published' then 'activation'
      -- Every nux event is an activation-funnel signal, including the two
      -- negative ones: a dismissal is a drop-off inside activation, and a
      -- restart is a re-entry into it. Filing them elsewhere would split one
      -- funnel across two categories.
      when 'nux.started' then 'activation'
      when 'nux.milestone_completed' then 'activation'
      when 'nux.dismissed' then 'activation'
      when 'nux.completed' then 'activation'
      when 'nux.restarted' then 'activation'
      -- engagement
      when 'user.signed_in' then 'engagement'
      when 'chat.message_sent' then 'engagement'
      when 'chat.sql_generated' then 'engagement'
      when 'chat.turn_completed' then 'engagement'
      when 'chat.turn_failed' then 'engagement'
      when 'dashboard.block_added_via_chat' then 'engagement'
      when 'dashboard.filter_changed' then 'engagement'
      when 'dashboard.share_settings_updated' then 'engagement'
      when 'dashboard.pdf_export_opened' then 'engagement'
      when 'dashboard.pdf_exported' then 'engagement'
      when 'query.failed' then 'engagement'
      -- expansion
      when 'workspace.invite_sent' then 'expansion'
      when 'workspace.invite_accepted' then 'expansion'
      when 'member.removed' then 'expansion'
      when 'dashboard.public_viewed' then 'expansion'
      -- Deletions are shrink signals, and `expansion` is the only category
      -- that models the account shrinking (see the enum's own comment, and
      -- `member.removed` above). Filing them under `engagement` would inflate
      -- engagement with churn.
      when 'dataset.deleted' then 'expansion'
      when 'dashboard.deleted' then 'expansion'
      -- revenue
      when 'subscription.created' then 'revenue'
      when 'subscription.plan_changed' then 'revenue'
      when 'subscription.status_changed' then 'revenue'
      else 'other'
    end
  )::public.usage_analytics_events__category;
$function$
;

grant insert on table "public"."user_nux_progress" to "authenticated";

grant select on table "public"."user_nux_progress" to "authenticated";

grant update on table "public"."user_nux_progress" to "authenticated";

grant delete on table "public"."user_nux_progress" to "service_role";

grant insert on table "public"."user_nux_progress" to "service_role";

grant select on table "public"."user_nux_progress" to "service_role";

grant update on table "public"."user_nux_progress" to "service_role";


  create policy "
  User can INSERT user_nux_progress they own
"
  on "public"."user_nux_progress"
  as permissive
  for insert
  to authenticated
with check ((user_id = ( SELECT auth.uid() AS uid)));



  create policy "
  User can SELECT user_nux_progress they own
"
  on "public"."user_nux_progress"
  as permissive
  for select
  to authenticated
using ((user_id = ( SELECT auth.uid() AS uid)));



  create policy "
  User can UPDATE user_nux_progress they own
"
  on "public"."user_nux_progress"
  as permissive
  for update
  to authenticated
using ((user_id = ( SELECT auth.uid() AS uid)));



  create policy "Authenticated users can INSERT analytics events for workspaces "
  on "public"."usage_analytics_events"
  as permissive
  for insert
  to authenticated
with check (((user_id = ( SELECT auth.uid() AS uid)) AND (client = ANY (ARRAY['web'::public.usage_analytics_events__client, 'desktop'::public.usage_analytics_events__client])) AND (event_name = ANY (ARRAY['dataset.imported'::text, 'query.ran'::text, 'query.failed'::text, 'dashboard.published'::text, 'dashboard.share_settings_updated'::text, 'dashboard.block_added_via_chat'::text, 'dashboard.filter_changed'::text, 'dashboard.pdf_export_opened'::text, 'dashboard.pdf_exported'::text, 'chat.message_sent'::text, 'chat.sql_generated'::text, 'nux.started'::text, 'nux.milestone_completed'::text, 'nux.dismissed'::text, 'nux.completed'::text, 'nux.restarted'::text])) AND ((workspace_id IS NULL) OR (EXISTS ( SELECT 1
   FROM public.workspace_memberships m
  WHERE ((m.workspace_id = usage_analytics_events.workspace_id) AND (m.user_id = ( SELECT auth.uid() AS uid))))))));


CREATE TRIGGER tr__user_nux_progress__set_updated_at BEFORE UPDATE ON public.user_nux_progress FOR EACH ROW EXECUTE FUNCTION public.util__set_updated_at();


