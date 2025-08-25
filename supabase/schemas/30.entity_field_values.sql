create table public.entity_field_values (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Timestamp of when the entity field value was created.
  created_at timestamptz not null default now(),
  -- Timestamp of when the entity field value was last updated.
  updated_at timestamptz not null default now(),
  -- Workspace this entity field value belongs to
  workspace_id uuid not null references public.workspaces (id) on update cascade on delete cascade,
  -- Entity this entity field value belongs to.
  -- If an entity is deleted, all entity field values linked to that entity are
  -- also deleted.
  entity_id uuid not null references public.entities (id) on update cascade on delete cascade,
  -- Entity config this entity field value belongs to
  entity_config_id uuid not null references public.entity_configs (id) on update cascade on delete cascade,
  -- Entity field config this entity field value belongs to
  -- If an entity field config is deleted, all entity field values linked to
  -- that entity field config are also deleted.
  entity_field_config_id uuid not null references public.entity_field_configs (id) on update cascade on delete cascade,
  -- Value of the entity field. This can be null.
  value text,
  -- Value set of the entity field, as a semi-colon-separated string
  -- This can never be null. If there are no values, it will be an empty string.
  value_set text not null,
  -- Dataset this entity field value came from (if available)
  -- If a dataset is deleted, all entity field values linked to that
  -- datasource are also deleted.
  dataset_id uuid references public.datasets (id) on update cascade on delete cascade
);

-- Enable row level security
alter table public.entity_field_values enable row level security;

-- Policies
create policy "
  User can SELECT entity field values in their workspace
" on public.entity_field_values for
select
  to authenticated using (
    public.entity_field_values.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  );

create policy "
  User can INSERT entity field values in their workspace
" on public.entity_field_values for insert to authenticated
with
  check (
    public.entity_field_values.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  );

create policy "
  User can UPDATE entity field values in their workspace
" on public.entity_field_values
for update
  to authenticated using (
    public.entity_field_values.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  );

create policy "
  User can DELETE entity field values in their workspace
" on public.entity_field_values for delete to authenticated using (
  public.entity_field_values.workspace_id = any (
    array(
      select
        public.util__get_auth_user_workspaces ()
    )
  )
);

/**
 * Trigger the `updated_at` update.
 */
create trigger tr_entity_field_values__set_updated_at before
update on public.entity_field_values for each row
execute function public.util__set_updated_at ();
