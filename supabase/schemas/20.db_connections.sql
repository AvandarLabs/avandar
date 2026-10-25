/**
 * A saved, reusable connection to an external data source, shared by every
 * workspace member - the generic half of the `db_connections` /
 * `db_connections__<type>` split, mirroring the `datasets` /
 * `datasets__<type>` pattern one layer up. A second connector type
 * (MySQL, MSSQL, ...) only ever adds a new satellite table and a new
 * `db_connections__connection_type` enum value, never a new "connections"
 * concept.
 *
 * Not a per-resource shareable item like a dataset or dashboard - a
 * connection is infrastructure configuration, so it is gated by app role
 * (`data_sources`) rather than `util__auth_user_can_access_resource`.
 */
create table public.db_connections (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Workspace this connection belongs to
  workspace_id uuid not null references public.workspaces (id) on update cascade on delete cascade,
  -- Which connector type this connection is for. The actual connection
  -- details live in the matching `db_connections__<type>` satellite table.
  connection_type public.db_connections__connection_type not null,
  -- User-chosen label, e.g. "Prod reporting replica"
  name text not null,
  -- User who created this connection
  created_by uuid references auth.users (id) on update cascade on delete set null,
  -- Timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable row level security
alter table public.db_connections enable row level security;

-- Data API privileges. `authenticated` is select-only: every write to this
-- table happens through the `connectors` edge function's
-- `service_role` client, never a direct Data API insert/update/delete,
-- because `vault_secret_id` (on the satellite table) is not a foreign key
-- and has no way to verify which connection actually created the Vault
-- secret it points at. Allowing a direct authenticated insert/update would
-- let any workspace editor "adopt" another workspace's vault_secret_id they
-- can legitimately read as a viewer there, decrypting that workspace's
-- password through this one's connection - RLS isolates rows by
-- workspace_id, but it cannot stop a row from pointing at a secret it
-- never created.
grant
select
  on table public.db_connections to authenticated,
  service_role;

grant insert,
update,
delete on table public.db_connections to service_role;

-- Policies
create policy "User can select db_connections in their workspace" on public.db_connections for
select
  to authenticated using (
    public.util__auth_user_meets_min_app_role (
      public.db_connections.workspace_id,
      'data_sources'::public.app_type,
      'editor'::public.role_level
    )
  );

create trigger tr_db_connections__set_updated_at before
update on public.db_connections for each row
execute function public.util__set_updated_at ();

create index idx_db_connections__workspace on public.db_connections (workspace_id);
