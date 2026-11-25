/**
 * One plugin content item a workspace imported as a dataset. The install
 * wizard and the plugin card in Settings read it to tell which items the
 * workspace already has, so an item is never imported twice.
 *
 * Not tied to an install, so it survives uninstall and a reinstall sees it.
 * Deleting the dataset deletes the row, so the item can be imported again.
 */
create table public.plugin_content_imports (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Workspace the item was imported into.
  workspace_id uuid not null references public.workspaces (id) on update cascade on delete cascade,
  -- Plugin id in `publisher.name` form, e.g. `avandar.mozambique`.
  plugin_id text not null constraint plugin_content_imports__plugin_id_format check (plugin_id ~ '^[a-z0-9-]+\.[a-z0-9-]+$'),
  -- The manifest's content id, e.g. `provinces`.
  content_id text not null constraint plugin_content_imports__content_id_format check (
    content_id ~ '^[a-z0-9-]+(\.[a-z0-9-]+)*$'
  ),
  -- The dataset the item was imported as.
  dataset_id uuid not null,
  -- User who imported the item.
  imported_by uuid default auth.uid () references auth.users (id) on update cascade on delete set null,
  -- Timestamp of when the item was imported.
  created_at timestamptz not null default now(),
  -- Keeps the dataset in the row's own workspace, and deletes the row with
  -- the dataset.
  constraint plugin_content_imports__dataset_in_workspace_fkey foreign key (dataset_id, workspace_id) references public.datasets (id, workspace_id) on update cascade on delete cascade,
  -- One import per content item of a plugin in a workspace.
  constraint plugin_content_imports__workspace_plugin_content_unique unique (workspace_id, plugin_id, content_id)
);

alter table public.plugin_content_imports enable row level security;

-- Data API privileges. `anon` is intentionally omitted. No `update` for
-- `authenticated`: an import row is written once and only ever deleted.
grant
select
,
  insert,
  delete on table public.plugin_content_imports to authenticated;

grant
select
,
  insert,
update,
delete on table public.plugin_content_imports to service_role;

-- Serves the foreign key's delete cascade from `datasets`, which looks up
-- imports by dataset.
create index idx_plugin_content_imports__dataset_id on public.plugin_content_imports (dataset_id);

-- Policies
create policy "Members can SELECT plugin content imports" on public.plugin_content_imports for
select
  to authenticated using (
    public.plugin_content_imports.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  );

create policy "Settings admins can INSERT plugin content imports" on public.plugin_content_imports for insert to authenticated
with
  check (
    public.util__can_manage_workspace_settings (
      public.plugin_content_imports.workspace_id
    ) and
    -- Pins the importer to the caller, as `plugin_installations` pins its
    -- installer.
    public.plugin_content_imports.imported_by is not distinct from (
      select
        auth.uid ()
    )
  );

create policy "Settings admins can DELETE plugin content imports" on public.plugin_content_imports for delete to authenticated using (
  public.util__can_manage_workspace_settings (
    public.plugin_content_imports.workspace_id
  )
);
