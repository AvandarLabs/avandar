/**
 * This table is used to track the versions and metadata of dexie dbs users have
 * on the frontend. This gives us an idea of which schemas have upgraded and
 * which dbs may now be stale.
 */
create table public.dexie_dbs (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- User id associated with this dexie db
  user_id uuid not null default auth.uid () references auth.users (id) on update cascade on delete no action,
  -- The dexie id of the database, unique per browser.
  -- The user can still manually clear their local storage, so it's possible
  -- to end up with some stale entries here.
  db_id uuid not null,
  -- The version of the dexie db
  version int not null,
  -- User agent of the browser that created this dexie db
  user_agent text not null,
  -- Timestamp when the dexie db was created.
  created_at timestamptz not null default now(),
  -- Timestamp of the last time this dexie db was sync'd
  last_seen_at timestamptz not null default now(),
  constraint dexie_dbs_unique_user_db_id unique (
    db_id,
    user_id
  )
);

-- Enable row level security
alter table public.dexie_dbs enable row level security;

-- Policies
create policy "
  User can SELECT dexie_dbs they own
" on public.dexie_dbs for
select
  to authenticated using (
    public.dexie_dbs.user_id = (
      select
        auth.uid ()
    )
  );

create policy "
  User can INSERT dexie_dbs they own
" on public.dexie_dbs for insert to authenticated
with
  check (
    public.dexie_dbs.user_id = (
      select
        auth.uid ()
    )
  );

create policy "
  User can UPDATE dexie_dbs they own
" on public.dexie_dbs
for update
  to authenticated using (
    public.dexie_dbs.user_id = (
      select
        auth.uid ()
    )
  );

create policy "
  User can DELETE dexie_dbs they own
" on public.dexie_dbs for delete to authenticated using (
  public.dexie_dbs.user_id = (
    select
      auth.uid ()
  )
);
