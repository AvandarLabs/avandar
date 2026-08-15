create schema if not exists "analytics";

drop policy "
  Anyone can INSERT to the waitlist
" on "public"."waitlist_signups";

drop policy "Authenticated users can INSERT analytics events for workspaces " on "public"."usage_analytics_events";

revoke insert on table "public"."usage_analytics_events" from "authenticated";

revoke delete on table "public"."waitlist_signups" from "anon";

revoke insert on table "public"."waitlist_signups" from "anon";

revoke references on table "public"."waitlist_signups" from "anon";

revoke select on table "public"."waitlist_signups" from "anon";

revoke trigger on table "public"."waitlist_signups" from "anon";

revoke truncate on table "public"."waitlist_signups" from "anon";

revoke update on table "public"."waitlist_signups" from "anon";

revoke delete on table "public"."waitlist_signups" from "authenticated";

revoke insert on table "public"."waitlist_signups" from "authenticated";

revoke references on table "public"."waitlist_signups" from "authenticated";

revoke select on table "public"."waitlist_signups" from "authenticated";

revoke trigger on table "public"."waitlist_signups" from "authenticated";

revoke truncate on table "public"."waitlist_signups" from "authenticated";

revoke update on table "public"."waitlist_signups" from "authenticated";

revoke delete on table "public"."waitlist_signups" from "service_role";

revoke insert on table "public"."waitlist_signups" from "service_role";

revoke references on table "public"."waitlist_signups" from "service_role";

revoke select on table "public"."waitlist_signups" from "service_role";

revoke trigger on table "public"."waitlist_signups" from "service_role";

revoke truncate on table "public"."waitlist_signups" from "service_role";

revoke update on table "public"."waitlist_signups" from "service_role";

alter table "public"."waitlist_signups" drop constraint "waitlist_signups_email_key";

alter table "public"."waitlist_signups" drop constraint "waitlist_signups_signup_code_key";

alter table "public"."waitlist_signups" drop constraint "waitlist_signups_pkey";

drop index if exists "public"."waitlist_signups_email_key";

drop index if exists "public"."waitlist_signups_pkey";

drop index if exists "public"."waitlist_signups_signup_code_key";

drop table "public"."waitlist_signups";

CREATE INDEX idx_workspace_invites__pending_email ON public.workspace_invites USING btree (lower(email)) WHERE (invite_status = 'pending'::public.workspace_invites__status);

set check_function_bodies = off;

create or replace view "analytics"."acquisition_funnel" as  WITH registrations AS (
         SELECT e.user_id,
            min(e.created_at) AS registered_at
           FROM public.usage_analytics_events e
          WHERE ((e.event_name = 'user.registered'::text) AND (e.user_id IS NOT NULL))
          GROUP BY e.user_id
        ), confirmations AS (
         SELECT e.user_id
           FROM public.usage_analytics_events e
          WHERE ((e.event_name = 'user.email_confirmed'::text) AND (e.user_id IS NOT NULL))
          GROUP BY e.user_id
        ), first_workspaces AS (
         SELECT e.user_id
           FROM public.usage_analytics_events e
          WHERE ((e.event_name = 'workspace.created'::text) AND (e.user_id IS NOT NULL))
          GROUP BY e.user_id
        ), user_weeks AS (
         SELECT date_trunc('week'::text, r.registered_at) AS cohort_week,
            count(*) AS users_registered,
            count(c.user_id) AS users_email_confirmed,
            count(w.user_id) AS users_created_workspace
           FROM ((registrations r
             LEFT JOIN confirmations c ON ((c.user_id = r.user_id)))
             LEFT JOIN first_workspaces w ON ((w.user_id = r.user_id)))
          GROUP BY (date_trunc('week'::text, r.registered_at))
        )
 SELECT u.cohort_week,
    u.users_registered,
    u.users_email_confirmed,
    u.users_created_workspace
   FROM user_weeks u
  ORDER BY u.cohort_week DESC;


create or replace view "analytics"."activation" as  SELECT w.id AS workspace_id,
    w.created_at AS workspace_created_at,
    min(e.created_at) FILTER (WHERE (e.event_name = 'dataset.imported'::text)) AS first_dataset_at,
    min(e.created_at) FILTER (WHERE (e.event_name = 'query.ran'::text)) AS first_query_at,
    min(e.created_at) FILTER (WHERE (e.event_name = 'dashboard.published'::text)) AS first_dashboard_published_at,
    (EXTRACT(epoch FROM (min(e.created_at) FILTER (WHERE (e.event_name = 'dataset.imported'::text)) - w.created_at)) / (86400)::numeric) AS days_to_first_dataset,
    (EXTRACT(epoch FROM (min(e.created_at) FILTER (WHERE (e.event_name = 'query.ran'::text)) - w.created_at)) / (86400)::numeric) AS days_to_first_query,
    (EXTRACT(epoch FROM (min(e.created_at) FILTER (WHERE (e.event_name = 'dashboard.published'::text)) - w.created_at)) / (86400)::numeric) AS days_to_first_dashboard_published
   FROM (public.workspaces w
     LEFT JOIN public.usage_analytics_events e ON ((e.workspace_id = w.id)))
  GROUP BY w.id, w.created_at
  ORDER BY w.created_at DESC;


create or replace view "analytics"."active_users" as  WITH daily_actives AS (
         SELECT (date_trunc('day'::text, e.created_at))::date AS activity_date,
            e.client,
            e.user_id
           FROM public.usage_analytics_events e
          WHERE ((e.event_category = 'engagement'::public.usage_analytics_events__category) AND (e.user_id IS NOT NULL))
          GROUP BY ((date_trunc('day'::text, e.created_at))::date), e.client, e.user_id
        ), reporting_dates AS (
         SELECT (generate_series((min(daily_actives.activity_date))::timestamp with time zone, (CURRENT_DATE)::timestamp with time zone, '1 day'::interval))::date AS activity_date
           FROM daily_actives
        ), clients AS (
         SELECT DISTINCT daily_actives.client
           FROM daily_actives
        ), reporting_days AS (
         SELECT d_1.activity_date,
            c.client
           FROM (reporting_dates d_1
             CROSS JOIN clients c)
        )
 SELECT d.activity_date,
    d.client,
    count(DISTINCT a.user_id) FILTER (WHERE (a.activity_date = d.activity_date)) AS daily_active_users,
    count(DISTINCT a.user_id) AS weekly_active_users
   FROM (reporting_days d
     LEFT JOIN daily_actives a ON (((a.client = d.client) AND (a.activity_date <= d.activity_date) AND (a.activity_date > (d.activity_date - 7)))))
  GROUP BY d.activity_date, d.client
  ORDER BY d.activity_date DESC, d.client;


create or replace view "analytics"."chat_health" as  WITH daily AS (
         SELECT (date_trunc('day'::text, e.created_at))::date AS activity_date,
            count(*) FILTER (WHERE (e.event_name = 'chat.message_sent'::text)) AS messages_sent,
            count(*) FILTER (WHERE ((e.event_name = 'chat.message_sent'::text) AND ((e.payload ->> 'runtimeMode'::text) = 'local'::text))) AS local_messages_sent,
            count(*) FILTER (WHERE ((e.event_name = 'chat.message_sent'::text) AND ((e.payload ->> 'runtimeMode'::text) = 'cloud'::text))) AS cloud_messages_sent,
            count(*) FILTER (WHERE (e.event_name = 'chat.turn_completed'::text)) AS turns_completed,
            count(*) FILTER (WHERE (e.event_name = 'chat.turn_failed'::text)) AS turns_failed,
            avg(((e.payload ->> 'attemptCount'::text))::numeric) FILTER (WHERE (e.event_name = 'chat.turn_completed'::text)) AS avg_attempt_count,
            max(((e.payload ->> 'attemptCount'::text))::numeric) FILTER (WHERE (e.event_name = 'chat.turn_completed'::text)) AS max_attempt_count,
            percentile_cont((0.5)::double precision) WITHIN GROUP (ORDER BY ((((e.payload ->> 'latencyMs'::text))::numeric)::double precision)) FILTER (WHERE (e.event_name = 'chat.turn_completed'::text)) AS median_latency_ms,
            ((count(*) FILTER (WHERE (e.event_name = 'chat.turn_failed'::text)))::numeric / (NULLIF(count(*) FILTER (WHERE (e.event_name = ANY (ARRAY['chat.turn_completed'::text, 'chat.turn_failed'::text]))), 0))::numeric) AS failure_rate
           FROM public.usage_analytics_events e
          WHERE (e.event_name = ANY (ARRAY['chat.message_sent'::text, 'chat.turn_completed'::text, 'chat.turn_failed'::text]))
          GROUP BY ((date_trunc('day'::text, e.created_at))::date)
        ), outcomes AS (
         SELECT (date_trunc('day'::text, e.created_at))::date AS activity_date,
            COALESCE((e.payload ->> 'outcome'::text), 'unknown'::text) AS outcome,
            count(*) AS outcome_count
           FROM public.usage_analytics_events e
          WHERE (e.event_name = 'chat.turn_completed'::text)
          GROUP BY ((date_trunc('day'::text, e.created_at))::date), COALESCE((e.payload ->> 'outcome'::text), 'unknown'::text)
        ), outcome_mixes AS (
         SELECT outcomes.activity_date,
            jsonb_object_agg(outcomes.outcome, outcomes.outcome_count) AS outcome_mix
           FROM outcomes
          GROUP BY outcomes.activity_date
        )
 SELECT d.activity_date,
    d.messages_sent,
    d.local_messages_sent,
    d.cloud_messages_sent,
    d.turns_completed,
    d.turns_failed,
    d.avg_attempt_count,
    d.max_attempt_count,
    d.median_latency_ms,
    d.failure_rate,
    om.outcome_mix
   FROM (daily d
     LEFT JOIN outcome_mixes om ON ((om.activity_date = d.activity_date)))
  ORDER BY d.activity_date DESC;


create or replace view "analytics"."invite_conversion" as  WITH sent AS (
         SELECT (e.payload ->> 'inviteId'::text) AS invite_id,
            e.workspace_id,
            e.user_id AS invited_by,
            e.created_at AS sent_at,
            (e.payload ->> 'invitedEmailDomain'::text) AS invited_email_domain,
            ((e.payload ->> 'inviteeAlreadyRegistered'::text))::boolean AS invitee_already_registered,
            ((e.payload ->> 'memberCountBefore'::text))::integer AS member_count_before
           FROM public.usage_analytics_events e
          WHERE (e.event_name = 'workspace.invite_sent'::text)
        ), accepted AS (
         SELECT (e.payload ->> 'inviteId'::text) AS invite_id,
            e.created_at AS accepted_at,
            ((e.payload ->> 'secondsFromInviteToAccept'::text))::numeric AS seconds_to_accept,
            ((e.payload ->> 'memberCountAfter'::text))::integer AS member_count_after
           FROM public.usage_analytics_events e
          WHERE (e.event_name = 'workspace.invite_accepted'::text)
        )
 SELECT s.invite_id,
    s.workspace_id,
    s.invited_by,
    s.invited_email_domain,
    s.invitee_already_registered,
    s.member_count_before,
    s.sent_at,
    a.accepted_at,
    (a.accepted_at IS NOT NULL) AS was_accepted,
    a.seconds_to_accept,
    a.member_count_after
   FROM (sent s
     LEFT JOIN accepted a ON ((a.invite_id = s.invite_id)))
  ORDER BY s.sent_at DESC;


create or replace view "analytics"."plan_movement" as  SELECT date_trunc('month'::text, e.created_at) AS month,
    count(*) FILTER (WHERE (e.event_name = 'subscription.created'::text)) AS subscriptions_created,
    count(*) FILTER (WHERE ((e.event_name = 'subscription.created'::text) AND ((e.payload ->> 'isPolarBacked'::text))::boolean)) AS polar_backed_subscriptions_created,
    count(*) FILTER (WHERE ((e.event_name = 'subscription.plan_changed'::text) AND ((e.payload ->> 'direction'::text) = 'upgrade'::text))) AS upgrades,
    count(*) FILTER (WHERE ((e.event_name = 'subscription.plan_changed'::text) AND ((e.payload ->> 'direction'::text) = 'downgrade'::text))) AS downgrades,
    count(*) FILTER (WHERE ((e.event_name = 'subscription.plan_changed'::text) AND ((e.payload ->> 'direction'::text) = 'lateral'::text))) AS lateral_moves,
    count(*) FILTER (WHERE ((e.event_name = 'subscription.status_changed'::text) AND ((e.payload ->> 'toStatus'::text) = 'canceled'::text))) AS cancellations
   FROM public.usage_analytics_events e
  WHERE (e.event_category = 'revenue'::public.usage_analytics_events__category)
  GROUP BY (date_trunc('month'::text, e.created_at))
  ORDER BY (date_trunc('month'::text, e.created_at)) DESC;


create or replace view "analytics"."retention_cohorts" as  WITH cohorts AS (
         SELECT e.user_id,
            date_trunc('week'::text, min(e.created_at)) AS cohort_week
           FROM public.usage_analytics_events e
          WHERE ((e.event_name = 'user.registered'::text) AND (e.user_id IS NOT NULL))
          GROUP BY e.user_id
        ), cohort_sizes AS (
         SELECT cohorts.cohort_week,
            count(*) AS cohort_size
           FROM cohorts
          GROUP BY cohorts.cohort_week
        ), cohort_weeks AS (
         SELECT cs.cohort_week,
            cs.cohort_size,
            generate_series(cs.cohort_week, date_trunc('week'::text, now()), '7 days'::interval) AS active_week
           FROM cohort_sizes cs
        ), sign_ins AS (
         SELECT e.user_id,
            date_trunc('week'::text, e.created_at) AS active_week,
            min(((e.payload ->> 'daysSinceLastSignIn'::text))::numeric) AS days_since_last_sign_in
           FROM public.usage_analytics_events e
          WHERE ((e.event_name = 'user.signed_in'::text) AND (e.user_id IS NOT NULL))
          GROUP BY e.user_id, (date_trunc('week'::text, e.created_at))
        )
 SELECT w.cohort_week,
    ((EXTRACT(epoch FROM (w.active_week - w.cohort_week)) / (604800)::numeric))::integer AS weeks_since_registration,
    w.cohort_size,
    count(DISTINCT s.user_id) AS returning_users,
    percentile_cont((0.5)::double precision) WITHIN GROUP (ORDER BY ((s.days_since_last_sign_in)::double precision)) AS median_days_since_last_sign_in
   FROM ((cohort_weeks w
     JOIN cohorts c ON ((c.cohort_week = w.cohort_week)))
     LEFT JOIN sign_ins s ON (((s.user_id = c.user_id) AND (s.active_week = w.active_week))))
  GROUP BY w.cohort_week, (((EXTRACT(epoch FROM (w.active_week - w.cohort_week)) / (604800)::numeric))::integer), w.cohort_size
  ORDER BY w.cohort_week DESC, (((EXTRACT(epoch FROM (w.active_week - w.cohort_week)) / (604800)::numeric))::integer);


CREATE OR REPLACE FUNCTION public.auth_users__log_registered_analytics_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  perform public.util__log_analytics_event(
    'user.registered',
    null,
    new.id,
    null,
    jsonb_build_object(
      'emailDomain', public.util__email_domain(new.email),
      'provider', new.raw_app_meta_data ->> 'provider',
      'hadPendingInvite', exists (
        select 1
        from public.workspace_invites i
        where lower(i.email) = lower(new.email) and
          i.invite_status = 'pending'
      )
    )
  );
  return null;
exception
  when others then
    return null;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.auth_users__log_updated_analytics_events()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if old.email_confirmed_at is null and new.email_confirmed_at is not null then
    perform public.util__log_analytics_event(
      'user.email_confirmed',
      null,
      new.id,
      null,
      jsonb_build_object(
        'emailDomain', public.util__email_domain(new.email),
        'secondsToConfirm', floor(
          extract(
            epoch
            from
              (new.email_confirmed_at - new.created_at)
          )
        )
      )
    );
  end if;

  if new.last_sign_in_at is distinct from old.last_sign_in_at and
    new.last_sign_in_at is not null then
    perform public.util__log_analytics_event(
      'user.signed_in',
      null,
      new.id,
      null,
      jsonb_build_object(
        'isFirstSignIn',
        old.last_sign_in_at is null,
        'daysSinceLastSignIn',
        case
          when old.last_sign_in_at is null then null
          else floor(
            extract(
              epoch
              from
                (new.last_sign_in_at - old.last_sign_in_at)
            ) / 86400
          )
        end
      )
    );
  end if;

  return null;
exception
  when others then
    return null;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.subscriptions__log_created_analytics_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  perform public.util__log_analytics_event(
    'subscription.created',
    new.workspace_id,
    new.subscription_owner_id,
    'settings'::public.app_type,
    jsonb_build_object(
      'plan', new.feature_plan_type::text,
      'isPolarBacked', new.polar_subscription_id is not null,
      'status', new.subscription_status::text
    )
  );
  return null;
exception
  when others then
    return null;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.subscriptions__log_updated_analytics_events()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if new.feature_plan_type is distinct from old.feature_plan_type then
    perform public.util__log_analytics_event(
      'subscription.plan_changed',
      new.workspace_id,
      new.subscription_owner_id,
      'settings'::public.app_type,
      jsonb_build_object(
        'fromPlan',
        old.feature_plan_type::text,
        'toPlan',
        new.feature_plan_type::text,
        'direction',
        case
          when public.util__subscription_plan_rank(new.feature_plan_type) >
          public.util__subscription_plan_rank(old.feature_plan_type) then 'upgrade'
          when public.util__subscription_plan_rank(new.feature_plan_type) <
          public.util__subscription_plan_rank(old.feature_plan_type) then 'downgrade'
          else 'lateral'
        end,
        'seats',
        new.max_seats_allowed
      )
    );
  end if;

  if new.subscription_status is distinct from old.subscription_status then
    perform public.util__log_analytics_event(
      'subscription.status_changed',
      new.workspace_id,
      new.subscription_owner_id,
      'settings'::public.app_type,
      jsonb_build_object(
        'fromStatus', old.subscription_status::text,
        'toStatus', new.subscription_status::text,
        'plan', new.feature_plan_type::text
      )
    );
  end if;

  return null;
exception
  when others then
    return null;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.util__email_domain(p_email text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  with normalized_email as (
    select lower(trim(p_email)) as value
  )
  select case
    when value ~ '^[^@]+@[^@]+$' then split_part(value, '@', 2)
    else null
  end
  from normalized_email;
$function$
;

CREATE OR REPLACE FUNCTION public.util__subscription_plan_rank(p_plan public.subscriptions__feature_plan_type)
 RETURNS integer
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select case p_plan
    when 'free' then 0
    when 'basic' then 1
    when 'premium' then 2
  end;
$function$
;

CREATE OR REPLACE FUNCTION public.workspace_invites__log_accepted_analytics_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if old.invite_status = 'accepted' or new.invite_status <> 'accepted' then
    return null;
  end if;

  perform public.util__log_analytics_event(
    'workspace.invite_accepted',
    new.workspace_id,
    new.user_id,
    'settings'::public.app_type,
    jsonb_build_object(
      'inviteId', new.id,
      'secondsFromInviteToAccept', floor(
        extract(
          epoch
          from
            (now() - new.created_at)
        )
      ),
      'memberCountAfter', (
        select count(*) + 1
        from public.workspace_memberships m
        where m.workspace_id = new.workspace_id and
          m.user_id is distinct from new.user_id
      )
    )
  );
  return null;
exception
  when others then
    return null;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.workspace_invites__log_sent_analytics_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  perform public.util__log_analytics_event(
    'workspace.invite_sent',
    new.workspace_id,
    new.invited_by,
    'settings'::public.app_type,
    jsonb_build_object(
      'inviteId', new.id,
      'invitedEmailDomain', public.util__email_domain(new.email),
      'inviteeAlreadyRegistered', exists (
        select 1
        from auth.users u
        where u.instance_id = (
          select inviter.instance_id
          from auth.users inviter
          where inviter.id = new.invited_by
        ) and
          lower(u.email) = lower(new.email)
      ),
      'memberCountBefore', (
        select count(*)
        from public.workspace_memberships m
        where m.workspace_id = new.workspace_id
      )
    )
  );
  return null;
exception
  when others then
    return null;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.workspace_memberships__log_removed_analytics_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  perform public.util__log_analytics_event(
    'member.removed',
    old.workspace_id,
    auth.uid(),
    'settings'::public.app_type,
    jsonb_build_object(
      'memberCountAfter',
      (
        select count(*)
        from public.workspace_memberships m
        where m.workspace_id = old.workspace_id
      )
    )
  );
  return null;
exception
  when others then
    return null;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.workspaces__log_created_analytics_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user_created_at timestamptz;
begin
  select u.created_at into v_user_created_at
  from auth.users u
  where u.id = new.owner_id;

  perform public.util__log_analytics_event(
    'workspace.created',
    new.id,
    new.owner_id,
    null,
    jsonb_build_object(
      'isFirstWorkspaceForUser',
      (
        select count(*) = 1
        from public.workspaces w
        where w.owner_id = new.owner_id
      ),
      'secondsSinceUserRegistered',
      case
        when v_user_created_at is null then null
        else floor(
          extract(
            epoch
            from
              (new.created_at - v_user_created_at)
          )
        )
      end
    )
  );
  return null;
exception
  when others then
    return null;
end;
$function$
;

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


  create policy "Authenticated users can INSERT analytics events for workspaces "
  on "public"."usage_analytics_events"
  as permissive
  for insert
  to authenticated
with check (((user_id = ( SELECT auth.uid() AS uid)) AND (client = ANY (ARRAY['web'::public.usage_analytics_events__client, 'desktop'::public.usage_analytics_events__client])) AND (event_name = ANY (ARRAY['dataset.imported'::text, 'query.ran'::text, 'query.failed'::text, 'dashboard.published'::text, 'dashboard.share_settings_updated'::text, 'dashboard.block_added_via_chat'::text, 'dashboard.filter_changed'::text, 'dashboard.pdf_export_opened'::text, 'dashboard.pdf_exported'::text, 'chat.message_sent'::text, 'chat.sql_generated'::text])) AND ((workspace_id IS NULL) OR (EXISTS ( SELECT 1
   FROM public.workspace_memberships m
  WHERE ((m.workspace_id = usage_analytics_events.workspace_id) AND (m.user_id = ( SELECT auth.uid() AS uid))))))));


CREATE TRIGGER tr__subscriptions__log_created_analytics_event AFTER INSERT ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.subscriptions__log_created_analytics_event();

CREATE TRIGGER tr__subscriptions__log_updated_analytics_events AFTER UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.subscriptions__log_updated_analytics_events();

CREATE TRIGGER tr__workspace_invites__log_accepted_analytics_event AFTER UPDATE ON public.workspace_invites FOR EACH ROW EXECUTE FUNCTION public.workspace_invites__log_accepted_analytics_event();

CREATE TRIGGER tr__workspace_invites__log_sent_analytics_event AFTER INSERT ON public.workspace_invites FOR EACH ROW EXECUTE FUNCTION public.workspace_invites__log_sent_analytics_event();

CREATE TRIGGER tr__workspace_memberships__log_removed_analytics_event AFTER DELETE ON public.workspace_memberships FOR EACH ROW EXECUTE FUNCTION public.workspace_memberships__log_removed_analytics_event();

CREATE TRIGGER tr__workspaces__log_created_analytics_event AFTER INSERT ON public.workspaces FOR EACH ROW EXECUTE FUNCTION public.workspaces__log_created_analytics_event();

CREATE TRIGGER tr__auth_users__log_registered_analytics_event AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.auth_users__log_registered_analytics_event();

CREATE TRIGGER tr__auth_users__log_updated_analytics_events AFTER UPDATE ON auth.users FOR EACH ROW EXECUTE FUNCTION public.auth_users__log_updated_analytics_events();

-- Schema and column privileges are maintained manually because the Supabase
-- schema diff does not reliably emit them.
revoke all on schema analytics from public, anon, authenticated;

grant usage on schema analytics to service_role;

grant insert (
  workspace_id,
  user_id,
  event_name,
  app,
  payload,
  client,
  app_version
) on public.usage_analytics_events to authenticated;

revoke execute on function public.auth_users__log_registered_analytics_event ()
from
  public,
  anon,
  authenticated;

revoke execute on function public.auth_users__log_updated_analytics_events ()
from
  public,
  anon,
  authenticated;

revoke execute on function public.subscriptions__log_created_analytics_event ()
from
  public,
  anon,
  authenticated;

revoke execute on function public.subscriptions__log_updated_analytics_events ()
from
  public,
  anon,
  authenticated;

revoke execute on function public.workspace_invites__log_accepted_analytics_event ()
from
  public,
  anon,
  authenticated;

revoke execute on function public.workspace_invites__log_sent_analytics_event ()
from
  public,
  anon,
  authenticated;

revoke execute on function public.workspace_memberships__log_removed_analytics_event ()
from
  public,
  anon,
  authenticated;

revoke execute on function public.workspaces__log_created_analytics_event ()
from
  public,
  anon,
  authenticated;

grant select on analytics.acquisition_funnel to service_role;
grant select on analytics.activation to service_role;
grant select on analytics.active_users to service_role;
grant select on analytics.chat_health to service_role;
grant select on analytics.invite_conversion to service_role;
grant select on analytics.plan_movement to service_role;
grant select on analytics.retention_cohorts to service_role;
