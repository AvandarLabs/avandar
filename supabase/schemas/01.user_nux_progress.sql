/**
 * One row per user per onboarding tutorial.
 *
 * Deliberately NOT scoped to a workspace. `user_profiles` is per workspace, so
 * it cannot answer "has this person ever been onboarded", and the product rule
 * is that the tutorial runs once per person for their whole Avandar life. A
 * second workspace must never re-trigger it.
 */
create table public.user_nux_progress (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Timestamp when the row was created
  created_at timestamptz not null default now(),
  -- Timestamp for last update
  updated_at timestamptz not null default now(),
  -- The user this progress belongs to
  user_id uuid not null default auth.uid () references auth.users (id) on update cascade on delete cascade,
  -- Which tutorial this row tracks. Only 'first_dashboard' exists today. The
  -- column plus the unique constraint below are what make a tutorial catalog
  -- additive later rather than another migration.
  tutorial_key text not null default 'first_dashboard',
  -- Lifecycle state. See `public.nux_status`.
  status public.nux_status not null default 'not_started',
  -- Milestone keys already finished, so a partial run resumes in place.
  -- Progress is persisted at milestone granularity, never per tooltip: four
  -- writes per tutorial instead of ten, and no resume-mid-tooltip bugs.
  -- Deliberately text[] rather than an enum, so renaming a milestone in
  -- TypeScript cannot make an existing row unreadable. The client filters
  -- unknown keys out on read.
  completed_milestones text[] not null default '{}',
  constraint user_nux_progress__unique_user_tutorial unique (user_id, tutorial_key)
);

-- Enable row level security
alter table public.user_nux_progress enable row level security;

/**
 * Trigger the `updated_at` update.
 */
create trigger tr_user_nux_progress__set_updated_at before
update on public.user_nux_progress for each row
execute function public.util__set_updated_at ();

-- Index to improve lookups by user
create index idx_user_nux_progress__user_id on public.user_nux_progress (user_id);

-- Table privileges live in `40.grants.data_api.sql` with every other table's,
-- so the whole Data API exposure surface can be read in one place. This table
-- gets `select, insert, update` for `authenticated` and nothing for `anon`.
-- Policies. A user may only ever read or write their own progress. There is
-- deliberately no DELETE policy: restarting the tutorial updates the row in
-- place, so there is no code path that needs to remove one.
create policy "
  User can SELECT user_nux_progress they own
" on public.user_nux_progress for
select
  to authenticated using (
    public.user_nux_progress.user_id = (
      select
        auth.uid ()
    )
  );

create policy "
  User can INSERT user_nux_progress they own
" on public.user_nux_progress for insert to authenticated
with
  check (
    public.user_nux_progress.user_id = (
      select
        auth.uid ()
    )
  );

create policy "
  User can UPDATE user_nux_progress they own
" on public.user_nux_progress
for update
  to authenticated using (
    public.user_nux_progress.user_id = (
      select
        auth.uid ()
    )
  );
