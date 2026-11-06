/**
 * Append-only log of every change to a case, and the source of the case
 * activity feed. Only database triggers write it, so no client or write path
 * can skip it. See docs/case-activity-architecture.md for every kind and its
 * payload.
 */
create table public.activity_events (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Workspace this event belongs to
  workspace_id uuid not null references public.workspaces (id) on update cascade on delete cascade,
  -- The case this event is about. A later subject adds its own nullable
  -- column and joins `activity_events__exactly_one_subject`.
  individual_id uuid references public.individuals (id) on update cascade on delete cascade,
  -- What happened
  kind public.activity_events__kind not null,
  -- Whether it happened in Avandar or in a connected service
  source public.activity_events__source not null default 'avandar',
  -- Who did it. Null for system and external events, or once the account is
  -- deleted.
  actor_user_id uuid references auth.users (id) on update cascade on delete set null,
  -- The comment, for comment kinds
  comment_id uuid references public.comments (id) on update cascade on delete cascade,
  -- When it happened. For external events, the third party's timestamp.
  occurred_at timestamptz not null default now(),
  -- When Avandar recorded it
  recorded_at timestamptz not null default now(),
  -- Kind-specific detail
  payload jsonb not null default '{}'::jsonb,
  -- Version of the payload shape for this kind
  payload_version smallint not null default 1,
  constraint activity_events__exactly_one_subject check (num_nonnulls (individual_id) = 1)
);

create index idx_activity_events__individual_occurred on public.activity_events (individual_id, occurred_at desc);

create index idx_activity_events__comment on public.activity_events (comment_id);

alter table public.activity_events enable row level security;

-- Data API privileges. Members read; only triggers write.
grant
select
  on table public.activity_events to authenticated;

grant
select
,
  insert,
update,
delete on table public.activity_events to service_role;

create policy "User can SELECT activity_events in their workspace" on public.activity_events for
select
  to authenticated using (
    public.activity_events.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  );
