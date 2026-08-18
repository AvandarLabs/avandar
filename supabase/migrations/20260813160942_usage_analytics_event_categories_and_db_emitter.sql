set check_function_bodies = off;

-- Columns and enums -----------------------------------------------------------

create type "public"."usage_analytics_events__category" as enum ('acquisition', 'activation', 'engagement', 'expansion', 'revenue', 'other');
create type "public"."usage_analytics_events__client" as enum ('web', 'desktop', 'server', 'db');

alter table "public"."usage_analytics_events" add column "app_version" text;

alter table "public"."usage_analytics_events" add column "client" public.usage_analytics_events__client not null default 'web'::public.usage_analytics_events__client;

alter table "public"."usage_analytics_events" add column "event_category" public.usage_analytics_events__category not null default 'other'::public.usage_analytics_events__category;

CREATE INDEX usage_analytics_events__event_category__created_at_idx ON public.usage_analytics_events USING btree (event_category, created_at DESC);

-- Event name -> category mapping ----------------------------------------------

CREATE OR REPLACE FUNCTION public.util__analytics_event_category(p_event_name text)
 RETURNS public.usage_analytics_events__category
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select (
    case p_event_name
      -- acquisition
      when 'waitlist.code_verified' then 'acquisition'
      when 'waitlist.code_claimed' then 'acquisition'
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
      -- revenue
      when 'subscription.created' then 'revenue'
      when 'subscription.plan_changed' then 'revenue'
      when 'subscription.status_changed' then 'revenue'
      else 'other'
    end
  )::public.usage_analytics_events__category;
$function$
;

CREATE OR REPLACE FUNCTION public.usage_analytics_events__set_category()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.event_category := public.util__analytics_event_category(new.event_name);
  return new;
end;
$function$
;

CREATE TRIGGER tr__usage_analytics_events__set_category BEFORE INSERT ON public.usage_analytics_events FOR EACH ROW EXECUTE FUNCTION public.usage_analytics_events__set_category();

-- Backfill --------------------------------------------------------------------

-- Backfill `event_category` for rows written before the column existed.
--
-- The column was added above with a default of 'other', so every pre-existing
-- row received that value. This recomputes them from the event name.
--
-- Scoped to `event_category = 'other'` so the statement is idempotent and so
-- re-running it can never overwrite a correctly categorised row. A row whose
-- name genuinely maps to `other` is simply rewritten to `other`.
--
-- `client` is deliberately not backfilled: its `web` default is already
-- correct for every pre-existing row, because the browser client was the only
-- writer before this change.
update public.usage_analytics_events
set
  event_category = public.util__analytics_event_category(event_name)
where
  event_category = 'other';

-- Database-side event emitter --------------------------------------------------

CREATE OR REPLACE FUNCTION public.util__log_analytics_event(p_event_name text, p_workspace_id uuid DEFAULT NULL::uuid, p_user_id uuid DEFAULT NULL::uuid, p_app public.app_type DEFAULT NULL::public.app_type, p_payload jsonb DEFAULT NULL::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  insert into public.usage_analytics_events (
    event_name,
    workspace_id,
    user_id,
    app,
    payload,
    client
  ) values (
    p_event_name,
    p_workspace_id,
    p_user_id,
    p_app,
    p_payload,
    'db'
  );
exception
  when others then
    null;
end;
$function$
;

revoke execute on function public.util__log_analytics_event (
  text,
  uuid,
  uuid,
  public.app_type,
  jsonb
) from public, anon, authenticated;
