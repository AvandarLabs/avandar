-- Usage analytics events.
-- Captures product-instrumentation events for first-party analytics. Kept
-- inside our own Postgres so we don't ship telemetry to a third party and
-- so users running on workspaces with sensitive data don't have to trust
-- an external analytics vendor.
-- Rows are intentionally not editable. The only valid operation is INSERT
-- by an authenticated workspace member, scoped to a workspace they belong
-- to. Reads are restricted to workspace owners via RLS. There is no
-- platform-admin concept: account-level rows (where `workspace_id` is null)
-- are readable only with the service role, which is how the reporting views
-- in the `analytics` schema are queried.
create table public.usage_analytics_events (
  id uuid primary key default gen_random_uuid(),
  -- The workspace the event is scoped to. Most events have a workspace. A
  -- few (signup, login) may not and may be NULL.
  workspace_id uuid references public.workspaces (id) on update cascade on delete cascade,
  -- The user that triggered the event. NULL for anonymous public dashboard
  -- views.
  user_id uuid references auth.users (id) on update cascade on delete set null,
  -- Short, stable event name. Examples: `dataset.imported`, `query.ran`,
  -- `dashboard.published`, `chat.message_sent`. Keep names stable so we
  -- can group by `event_name` over time.
  event_name text not null,
  -- Optional app surface where the event originated (data_sources,
  -- data_explorer, dashboards, gis, settings). Null for events that aren't
  -- bound to a specific app surface.
  app public.app_type,
  -- Optional free-form JSON payload. Keep payloads small and scrubbed of
  -- PII. RLS allows anything that lands here to be readable by workspace
  -- owners.
  payload jsonb,
  created_at timestamptz not null default now(),
  -- Funnel stage this event belongs to. Never set by callers: the
  -- `tr__usage_analytics_events__set_category` trigger overwrites whatever was
  -- passed with `util__analytics_event_category(event_name)`, so reporting can
  -- trust that this column always agrees with `event_name`. The default exists
  -- for two reasons: adding a NOT NULL column to a table with existing rows
  -- needs one, and an insert still succeeds if the trigger is ever dropped.
  event_category public.usage_analytics_events__category not null default 'other',
  -- Which runtime emitted the row. Every writer sets this explicitly:
  -- `AnalyticsClient` sends `web` or `desktop`, the edge helper sends
  -- `server`, and `util__log_analytics_event` sends `db`. The `web` default
  -- correctly backfills every row written before this column existed, all of
  -- which came from the browser client (the only writer at the time).
  client public.usage_analytics_events__client not null default 'web',
  -- Build version of the emitting app, for correlating a regression with a
  -- release. Null for `db` and `server` rows, which have no build version.
  app_version text
);

create index usage_analytics_events__workspace_id__created_at_idx on public.usage_analytics_events (
  workspace_id,
  created_at desc
);

create index usage_analytics_events__event_name__created_at_idx on public.usage_analytics_events (
  event_name,
  created_at desc
);

create index usage_analytics_events__event_category__created_at_idx on public.usage_analytics_events (
  event_category,
  created_at desc
);

alter table public.usage_analytics_events enable row level security;

-- INSERT: any authenticated user can record events for workspaces they
-- are a member of. We trust the client to set workspace_id correctly,
-- and we verify the user_id matches the JWT principal so a member can't
-- record events as another user.
create policy "Authenticated users can INSERT analytics events for workspaces they belong to" on public.usage_analytics_events for insert to authenticated
with
  check (
    (
      user_id is null or
      user_id = auth.uid ()
    ) and
    (
      workspace_id is null or
      exists (
        select
          1
        from
          public.workspace_memberships m
        where
          m.workspace_id = usage_analytics_events.workspace_id and
          m.user_id = auth.uid ()
      )
    )
  );

-- SELECT: workspace owners and Settings Admins can read events for their
-- workspaces. This powers the workspace usage admin panel and the private
-- resource ownership-transfer audit trail: a Settings Admin who is not the
-- workspace owner performs transfers and must be able to read the record.
create policy "Workspace managers can SELECT analytics events for their workspaces" on public.usage_analytics_events for
select
  to authenticated using (
    workspace_id is not null and
    public.util__can_manage_workspace_settings (
      public.usage_analytics_events.workspace_id
    )
  );

-- Maps a stable event name to its funnel stage. This is the single source of
-- truth for `usage_analytics_events.event_category`, and
-- `tr__usage_analytics_events__set_category` is its only caller.
--
-- The mapping lives in SQL rather than in the TypeScript event registry
-- because Postgres triggers emit many of these events and cannot read
-- TypeScript. The registry at
-- `shared/analytics/analyticsEvents/analyticsEvents.ts` mirrors it for
-- developer reference, and a Vitest drift guard fails if the two disagree.
--
-- An unknown name returns `other` rather than raising: recording analytics
-- must never reject a user action.
--
-- @param p_event_name: the event's stable name
-- @returns: the event's funnel stage
create or replace function public.util__analytics_event_category (
  p_event_name text
) returns public.usage_analytics_events__category as $$
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
$$ language sql immutable;

-- Forces `event_category` to agree with `event_name`.
--
-- Runs BEFORE INSERT for two reasons: it satisfies the column's NOT NULL
-- constraint when a caller omits the value, and it deliberately overwrites a
-- caller-supplied value. Reporting groups by this column, so it must never
-- disagree with the event name, and no client is trusted to get it right.
--
-- @returns: trigger
create or replace function public.usage_analytics_events__set_category () returns trigger as $$
begin
  new.event_category := public.util__analytics_event_category(new.event_name);
  return new;
end;
$$ language plpgsql;

create trigger tr__usage_analytics_events__set_category before insert on public.usage_analytics_events for each row
execute function public.usage_analytics_events__set_category ();

-- Records an analytics event from a Postgres trigger. Triggers must call this
-- rather than inserting directly.
--
-- `client` is always `db` and `app_version` is always null, set here rather
-- than accepted as parameters so no caller can get them wrong. The
-- `event_category` is set by `tr__usage_analytics_events__set_category`.
--
-- The body swallows every error. Recording analytics must never roll back the
-- write that triggered it (a signup, an invite, a subscription change), so this
-- returns cleanly even when the insert fails. The `exception` block runs in a
-- subtransaction, so a failure here rolls back only the failed insert.
--
-- SECURITY DEFINER is required to insert past RLS from a trigger, so EXECUTE is
-- revoked from every client-reachable role. Without that revoke, any
-- authenticated user could forge events for another user or workspace through
-- PostgREST. `search_path` is pinned empty, so every reference is fully
-- qualified.
--
-- @param p_event_name: stable event name; see util__analytics_event_category
-- @param p_workspace_id: workspace the event belongs to, or null
-- @param p_user_id: user who triggered the event, or null
-- @param p_app: app surface, or null when the event is not bound to one
-- @param p_payload: small, PII-free JSON payload, or null
-- @returns: void
create or replace function public.util__log_analytics_event (
  p_event_name text,
  p_workspace_id uuid default null,
  p_user_id uuid default null,
  p_app public.app_type default null,
  p_payload jsonb default null
) returns void as $$
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
$$ language plpgsql security definer
set
  search_path = '';

revoke
execute on function public.util__log_analytics_event (
  text,
  uuid,
  uuid,
  public.app_type,
  jsonb
)
from
  public,
  anon,
  authenticated;
