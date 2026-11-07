/**
 * One plugin installed in one workspace. The row exists only while the plugin
 * is installed. Uninstalling deletes it.
 */
create table public.plugin_installations (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Workspace the plugin is installed in.
  workspace_id uuid not null references public.workspaces (id) on update cascade on delete cascade,
  -- Plugin id in `publisher.name` form, e.g. `avandar.epidemiology`.
  plugin_id text not null constraint plugin_installations__plugin_id_format check (plugin_id ~ '^[a-z0-9-]+\.[a-z0-9-]+$'),
  -- Manifest version when the plugin was installed or last re-approved.
  installed_version text not null,
  -- A disabled plugin keeps its row but contributes nothing.
  is_enabled boolean not null default true,
  -- Manifest permissions an admin approved. A bundled manifest asking for
  -- more is hidden until an admin approves again.
  granted_permissions text[] not null default '{}',
  -- User who installed the plugin.
  installed_by uuid default auth.uid () references auth.users (id) on update cascade on delete set null,
  -- Timestamp of when the plugin was installed.
  created_at timestamptz not null default now(),
  -- Timestamp of the last change to this install.
  updated_at timestamptz not null default now(),
  constraint plugin_installations__workspace_plugin_unique unique (workspace_id, plugin_id)
);

alter table public.plugin_installations enable row level security;

-- Data API privileges. `anon` is intentionally omitted.
grant
select
,
  insert,
update,
delete on table public.plugin_installations to authenticated,
service_role;

/**
 * Prevents an install from moving to another workspace or from being
 * repointed at another plugin. Either would make the row a different install.
 */
create or replace function public.plugin_installations__prevent_identity_change () returns trigger language plpgsql
set
  search_path = '' as $$
begin
  if new.workspace_id is distinct from old.workspace_id then
    raise exception 'plugin installation workspace_id cannot be changed'
      using errcode = '23514';
  end if;

  if new.plugin_id is distinct from old.plugin_id then
    raise exception 'plugin installation plugin_id cannot be changed'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

-- Trigger-only. The trigger machinery does not consult EXECUTE.
revoke
execute on function public.plugin_installations__prevent_identity_change ()
from
  public,
  anon,
  authenticated,
  service_role;

create trigger tr__plugin_installations__prevent_identity_change before
update of workspace_id,
plugin_id on public.plugin_installations for each row
execute function public.plugin_installations__prevent_identity_change ();

create trigger tr__plugin_installations__set_updated_at before
update on public.plugin_installations for each row
execute function public.util__set_updated_at ();

-- Policies
create policy "Members can SELECT plugin installations" on public.plugin_installations for
select
  to authenticated using (
    public.plugin_installations.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  );

create policy "Settings admins can INSERT plugin installations" on public.plugin_installations for insert to authenticated
with
  check (
    public.util__can_manage_workspace_settings (
      public.plugin_installations.workspace_id
    ) and
    -- Pins the installer to the caller. Not enforced on UPDATE, because
    -- settings admins must be able to update installs another admin created,
    -- and the UPDATE policy checks only workspace settings access.
    public.plugin_installations.installed_by is not distinct from (
      select
        auth.uid ()
    )
  );

create policy "Settings admins can UPDATE plugin installations" on public.plugin_installations
for update
  to authenticated using (
    public.util__can_manage_workspace_settings (
      public.plugin_installations.workspace_id
    )
  )
with
  check (
    public.util__can_manage_workspace_settings (
      public.plugin_installations.workspace_id
    )
  );

create policy "Settings admins can DELETE plugin installations" on public.plugin_installations for delete to authenticated using (
  public.util__can_manage_workspace_settings (
    public.plugin_installations.workspace_id
  )
);
