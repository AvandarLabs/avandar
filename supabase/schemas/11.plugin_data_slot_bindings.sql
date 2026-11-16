/**
 * Which workspace records one installed plugin's data slot reads: a case
 * type or a dataset, and which of its fields fills each slot attribute. The
 * install wizard and the plugin card in Settings write it. A plugin command
 * reads through it with `avandar.data.querySlot`.
 *
 * Uninstalling deletes the install row and with it every binding. Deleting
 * the bound case type or dataset sets its id to null, which the client reads
 * as a broken binding.
 */
create table public.plugin_data_slot_bindings (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Workspace of the binding. Always the install's workspace, which
  -- `tr__plugin_data_slot_bindings__check_workspace` enforces.
  workspace_id uuid not null references public.workspaces (id) on update cascade on delete cascade,
  -- The plugin install this binding belongs to.
  installation_id uuid not null references public.plugin_installations (id) on update cascade on delete cascade,
  -- The manifest's data slot id, e.g. `cases`.
  slot_id text not null constraint plugin_data_slot_bindings__slot_id_format check (slot_id ~ '^[a-zA-Z][a-zA-Z0-9]*$'),
  -- Whether the slot reads a case type or a dataset.
  source_type public.plugin_data_slot_bindings__source_type not null,
  -- The case type the slot reads. Null unless `source_type` is `concept`,
  -- and null again once that case type is deleted.
  concept_id uuid references public.concepts (id) on update cascade on delete set null,
  -- The dataset the slot reads. Null unless `source_type` is `dataset`, and
  -- null again once that dataset is deleted.
  dataset_id uuid references public.datasets (id) on update cascade on delete set null,
  -- Slot attribute key to the case type attribute id or the dataset column
  -- id that fills it, e.g. `{ "onsetDate": "<attribute id>" }`.
  attribute_map jsonb not null default '{}'::jsonb constraint plugin_data_slot_bindings__attribute_map_object check (jsonb_typeof(attribute_map) = 'object'),
  -- User who last bound the slot.
  bound_by uuid default auth.uid () references auth.users (id) on update cascade on delete set null,
  -- Timestamp of when the slot was first bound.
  created_at timestamptz not null default now(),
  -- Timestamp of the last change to this binding.
  updated_at timestamptz not null default now(),
  -- At most one source id, and only the one `source_type` names. Both null
  -- means the source was deleted.
  constraint plugin_data_slot_bindings__source_matches_type check (
    (
      source_type = 'concept' and
      dataset_id is null
    ) or
    (
      source_type = 'dataset' and
      concept_id is null
    )
  ),
  -- One binding per slot of an install. Its index also serves every lookup
  -- of an install's bindings.
  constraint plugin_data_slot_bindings__installation_slot_unique unique (installation_id, slot_id)
);

alter table public.plugin_data_slot_bindings enable row level security;

-- Data API privileges. `anon` is intentionally omitted.
grant
select
,
  insert,
update,
delete on table public.plugin_data_slot_bindings to authenticated,
service_role;

/**
 * Keeps a data slot binding inside one workspace: its install, and the case
 * type or dataset it reads, must all be in the binding's own workspace.
 * Without it a settings admin of two workspaces could point one workspace's
 * plugin at another workspace's records.
 *
 * SECURITY DEFINER so the check reads the install, the case type, and the
 * dataset whatever the caller's RLS allows: it validates the binding's
 * shape, not the caller's access to the records, which `querySlot` checks
 * when it reads them. A BEFORE trigger runs ahead of the RLS `with check`,
 * so every lookup is scoped to the binding's own workspace and each error
 * names only an id the caller supplied. A record in another workspace reads
 * as missing.
 */
create or replace function public.plugin_data_slot_bindings__check_workspace () returns trigger language plpgsql security definer
set
  search_path = '' as $$
begin
  if not exists (
    select 1
    from public.plugin_installations installation
    where
      installation.id = new.installation_id
      and installation.workspace_id = new.workspace_id
  ) then
    raise exception 'A data slot binding must be in its plugin install''s workspace'
      using
        errcode = '23514',
        hint = 'installation_not_in_workspace',
        detail = format('installation_id %s', new.installation_id);
  end if;

  if new.concept_id is not null and not exists (
    select 1
    from public.concepts concept
    where
      concept.id = new.concept_id
      and concept.workspace_id = new.workspace_id
  ) then
    raise exception 'A data slot binding can only read a case type of its own workspace'
      using
        errcode = '23514',
        hint = 'concept_not_in_workspace',
        detail = format('concept_id %s', new.concept_id);
  end if;

  if new.dataset_id is not null and not exists (
    select 1
    from public.datasets dataset
    where
      dataset.id = new.dataset_id
      and dataset.workspace_id = new.workspace_id
  ) then
    raise exception 'A data slot binding can only read a dataset of its own workspace'
      using
        errcode = '23514',
        hint = 'dataset_not_in_workspace',
        detail = format('dataset_id %s', new.dataset_id);
  end if;

  return new;
end;
$$;

-- Trigger-only. The trigger machinery does not consult EXECUTE, so no Data
-- API role needs a grant for the trigger to fire.
revoke
execute on function public.plugin_data_slot_bindings__check_workspace ()
from
  public,
  anon,
  authenticated,
  service_role;

-- `before`, so a refused binding never reaches the foreign key checks and
-- the error names the real problem. Deleting a bound case type or dataset
-- fires it too, through `on delete set null`, and passes, because a null id
-- is not checked.
create trigger tr__plugin_data_slot_bindings__check_workspace before insert or
update of workspace_id,
installation_id,
concept_id,
dataset_id on public.plugin_data_slot_bindings for each row
execute function public.plugin_data_slot_bindings__check_workspace ();

/**
 * Refuses a binding that is broken from the start: one whose `source_type`
 * names a case type or a dataset but whose matching id is null. The table's
 * check constraint has to allow that state, because deleting the bound case
 * type or dataset sets the id to null while `source_type` stays, and the
 * client reads it as a broken binding. This trigger allows the state only
 * for that delete.
 *
 * An insert must name the source its type says. An update that changes
 * `source_type` must name the new type's source. An update that nulls the id
 * of an unchanged `source_type` is allowed only inside the `on delete set
 * null` foreign key action, which runs as a trigger of its own, so
 * `pg_trigger_depth()` is greater than 1 there. A direct write is depth 1 and
 * is refused: to remove a binding, delete it. An update that leaves an
 * already null id as it is (a change to `attribute_map`, or a repeat of the
 * null) is allowed, so a broken binding can still be rebound or edited. A
 * null `source_type` is passed through, so the column's not null constraint
 * reports it instead of a misleading source error.
 *
 * The `pg_trigger_depth() > 1` exemption relies on nothing else writing this
 * table from inside a trigger or a function a trigger calls. Any other writer
 * that updates these columns at that depth would skip the check, so a future
 * one must keep this in mind and not do it.
 *
 * SECURITY INVOKER: it only reads the row being written.
 */
create or replace function public.plugin_data_slot_bindings__check_source () returns trigger language plpgsql
set
  search_path = '' as $$
declare
  v_is_source_missing boolean;
  v_is_source_unchanged boolean;
begin
  if new.source_type is null then
    return new;
  end if;

  v_is_source_missing := case new.source_type
    when 'concept' then new.concept_id is null
    else new.dataset_id is null
  end;

  if not v_is_source_missing then
    return new;
  end if;

  if tg_op = 'UPDATE' and new.source_type = old.source_type then
    v_is_source_unchanged := case new.source_type
      when 'concept' then old.concept_id is null
      else old.dataset_id is null
    end;

    if v_is_source_unchanged or pg_trigger_depth () > 1 then
      return new;
    end if;
  end if;

  raise exception 'A data slot binding must name the % its source type says', case new.source_type
      when 'concept' then 'case type'
      else 'dataset'
    end
    using
      errcode = '23514',
      hint = 'source_required',
      detail = format('slot_id %s, source_type %s', new.slot_id, new.source_type);
end;
$$;

-- Trigger-only. The trigger machinery does not consult EXECUTE.
revoke
execute on function public.plugin_data_slot_bindings__check_source ()
from
  public,
  anon,
  authenticated,
  service_role;

create trigger tr__plugin_data_slot_bindings__check_source before insert or
update of source_type,
concept_id,
dataset_id on public.plugin_data_slot_bindings for each row
execute function public.plugin_data_slot_bindings__check_source ();

/**
 * Stamps `bound_by` from the signed-in user, so a caller can neither name
 * another user as the binder nor leave the previous binder on a binding they
 * changed. An insert always takes the caller. An update takes the caller only
 * when it changes what the slot reads (`source_type`, `concept_id`,
 * `dataset_id`, or `attribute_map`), and otherwise keeps the existing binder.
 * With no signed-in user (the service role, tests), the value is left alone.
 *
 * An update inside the `on delete set null` foreign key action, which runs as
 * a trigger of its own (`pg_trigger_depth()` is greater than 1), is left
 * alone: the action changes only its own column, so the existing binder stays.
 * Otherwise deleting a bound case type or dataset would restamp the binding
 * with whoever deleted it instead of whoever bound it. The same action also
 * clears `bound_by` when the binder's account is deleted, so the row must not
 * be restored to the old value here.
 *
 * SECURITY INVOKER: it only reads `auth.uid()` and the row being written.
 */
create or replace function public.plugin_data_slot_bindings__stamp_bound_by () returns trigger language plpgsql
set
  search_path = '' as $$
begin
  if tg_op = 'UPDATE' and pg_trigger_depth () > 1 then
    return new;
  end if;

  if auth.uid () is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.bound_by := auth.uid ();
  elsif
    new.source_type is distinct from old.source_type or
    new.concept_id is distinct from old.concept_id or
    new.dataset_id is distinct from old.dataset_id or
    new.attribute_map is distinct from old.attribute_map
  then
    new.bound_by := auth.uid ();
  else
    new.bound_by := old.bound_by;
  end if;

  return new;
end;
$$;

-- Trigger-only. The trigger machinery does not consult EXECUTE.
revoke
execute on function public.plugin_data_slot_bindings__stamp_bound_by ()
from
  public,
  anon,
  authenticated,
  service_role;

create trigger tr__plugin_data_slot_bindings__stamp_bound_by before insert or
update on public.plugin_data_slot_bindings for each row
execute function public.plugin_data_slot_bindings__stamp_bound_by ();

create trigger tr__plugin_data_slot_bindings__set_updated_at before
update on public.plugin_data_slot_bindings for each row
execute function public.util__set_updated_at ();

-- Policies
create policy "Members can SELECT plugin data slot bindings" on public.plugin_data_slot_bindings for
select
  to authenticated using (
    public.plugin_data_slot_bindings.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  );

create policy "Settings admins can INSERT plugin data slot bindings" on public.plugin_data_slot_bindings for insert to authenticated
with
  check (
    public.util__can_manage_workspace_settings (
      public.plugin_data_slot_bindings.workspace_id
    ) and
    -- Pins the binder to the caller, as `plugin_installations` pins its
    -- installer. Not enforced on UPDATE, so a settings admin can change a
    -- binding another admin made.
    public.plugin_data_slot_bindings.bound_by is not distinct from (
      select
        auth.uid ()
    )
  );

create policy "Settings admins can UPDATE plugin data slot bindings" on public.plugin_data_slot_bindings
for update
  to authenticated using (
    public.util__can_manage_workspace_settings (
      public.plugin_data_slot_bindings.workspace_id
    )
  )
with
  check (
    public.util__can_manage_workspace_settings (
      public.plugin_data_slot_bindings.workspace_id
    )
  );

create policy "Settings admins can DELETE plugin data slot bindings" on public.plugin_data_slot_bindings for delete to authenticated using (
  public.util__can_manage_workspace_settings (
    public.plugin_data_slot_bindings.workspace_id
  )
);
