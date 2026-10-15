/**
 * Postgres-specific connection details - the satellite half of the
 * `db_connections` / `db_connections__postgres` split (design spec section
 * 5.1). Host/port/database/username are operational metadata visible to any
 * workspace editor, same sensitivity tier as `datasets__google_sheets`'s
 * plain `google_document_id` column; only the password lives behind Vault.
 */
create table public.db_connections__postgres (
  -- One row per postgres connection, keyed to its generic `db_connections` row.
  connection_id uuid primary key references public.db_connections (id) on update cascade on delete cascade,
  -- Denormalized from `db_connections.workspace_id`, same reasoning as
  -- `datasets__google_sheets.workspace_id`: lets RLS and indexes on this
  -- table avoid a join back to the parent.
  workspace_id uuid not null references public.workspaces (id) on update cascade on delete cascade,
  host text not null,
  port integer not null,
  database_name text not null,
  username text not null,
  ssl_mode public.db_connections__postgres_ssl_mode not null default 'require',
  -- Points at the Vault secret holding the password alone (design spec
  -- section 5.2) - never the password itself. Deliberately not a foreign
  -- key: `vault.secrets` is owned by the Vault extension, not this
  -- application's schema, so this column trusts the single write path
  -- (the `external-datasets` edge function via the security-definer
  -- wrapper below) to keep it valid rather than coupling the declarative
  -- schema to an extension-managed table.
  vault_secret_id uuid not null,
  -- Set on every successful test-and-save or table listing; drives
  -- "last connected" UI copy.
  last_verified_at timestamptz,
  -- Timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable row level security
alter table public.db_connections__postgres enable row level security;

-- Data API privileges. `authenticated` is select-only, same reasoning as
-- `db_connections` above: `vault_secret_id` has no way to verify which
-- connection created the Vault secret it references, so every write must
-- go through the edge function's `service_role` client, never a direct
-- Data API insert/update/delete.
grant
select on table public.db_connections__postgres to authenticated,
service_role;

grant insert, update, delete on table public.db_connections__postgres to service_role;

-- Policies
create policy "User can select db_connections__postgres in their workspace" on public.db_connections__postgres for
select
  to authenticated using (
    public.util__auth_user_meets_min_app_role (
      public.db_connections__postgres.workspace_id,
      'data_sources'::public.app_type,
      'viewer'::public.role_level
    )
  );

create trigger tr_db_connections__postgres__set_updated_at before
update on public.db_connections__postgres for each row
execute function public.util__set_updated_at ();
