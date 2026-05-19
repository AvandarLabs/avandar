-- Usage analytics events.
-- Captures product-instrumentation events for first-party analytics. Kept
-- inside our own Postgres so we don't ship telemetry to a third party and
-- so beta users running on workspaces with sensitive data don't have to
-- trust an external analytics vendor.
--
-- Rows are intentionally not editable. The only valid operation is INSERT
-- by an authenticated workspace member, scoped to a workspace they belong
-- to. Reads are restricted to workspace owners + global admins via RLS so
-- we can build admin dashboards on top of this table later without
-- exposing one user's session to another.
create table public.usage_analytics_events (
  id uuid primary key default gen_random_uuid(),
  -- The workspace the event is scoped to. Most events have a workspace; a
  -- few (signup, login) may not — for those we allow NULL.
  workspace_id uuid references public.workspaces (id) on update cascade on delete cascade,
  -- The user that triggered the event. NULL for anonymous public dashboard
  -- views.
  user_id uuid references auth.users (id) on update cascade on delete set null,
  -- Short, stable event name. Examples: `dataset.imported`, `query.ran`,
  -- `dashboard.published`, `chat.message_sent`. Keep names stable so we
  -- can group by `event_name` over time.
  event_name text not null,
  -- Optional app surface where the event originated (data_sources,
  -- data_explorer, dashboards, settings). Null for events that aren't
  -- bound to a specific app surface.
  app public.app_type,
  -- Optional free-form JSON payload. Keep payloads small and scrubbed of
  -- PII — anything that lands here will be readable by workspace owners.
  payload jsonb,
  created_at timestamptz not null default now()
);

create index usage_analytics_events__workspace_id__created_at_idx on public.usage_analytics_events (workspace_id, created_at desc);
create index usage_analytics_events__event_name__created_at_idx on public.usage_analytics_events (event_name, created_at desc);

alter table public.usage_analytics_events enable row level security;

-- INSERT: any authenticated user can record events for workspaces they
-- are a member of. We trust the client to set workspace_id correctly,
-- and we verify the user_id matches the JWT principal so a member can't
-- record events as another user.
create policy "
  Authenticated users can INSERT analytics events for workspaces they belong to
" on public.usage_analytics_events for insert to authenticated
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

-- SELECT: workspace owners can read events for their workspaces. This
-- powers the future "workspace usage" admin panel without needing a
-- service-role round trip.
create policy "
  Workspace owners can SELECT analytics events for their workspaces
" on public.usage_analytics_events for select to authenticated
using (
  workspace_id is not null
  and exists (
    select 1 from public.workspaces w
    where w.id = usage_analytics_events.workspace_id
      and w.owner_id = auth.uid()
  )
);
