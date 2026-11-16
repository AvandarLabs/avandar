/**
 * Which workspace records one installed plugin's data slot reads: a case
 * type or a dataset, and which of its fields fills each slot attribute. The
 * install wizard and the plugin card in Settings write it. A plugin command
 * reads through it with `avandar.data.querySlot`.
 *
 * A binding stays inside one workspace: its install, and the case type or
 * dataset it reads, must be in the binding's own workspace. Composite foreign
 * keys enforce that, so row level security refuses a non-member before any id
 * is looked up.
 *
 * Uninstalling deletes the install row and with it every binding. Deleting
 * the bound case type or dataset sets its id to null, which the client reads
 * as a broken binding.
 */
create table public.plugin_data_slot_bindings (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Workspace of the binding. Always the install's workspace, and the
  -- workspace of the case type or dataset it reads: the composite foreign
  -- keys below enforce both.
  workspace_id uuid not null references public.workspaces (id) on update cascade on delete cascade,
  -- The plugin install this binding belongs to.
  installation_id uuid not null,
  -- The manifest's data slot id, e.g. `cases`.
  slot_id text not null constraint plugin_data_slot_bindings__slot_id_format check (slot_id ~ '^[a-zA-Z][a-zA-Z0-9]*$'),
  -- Whether the slot reads a case type or a dataset.
  source_type public.plugin_data_slot_bindings__source_type not null,
  -- The case type the slot reads. Null unless `source_type` is `concept`,
  -- and null again once that case type is deleted.
  concept_id uuid,
  -- The dataset the slot reads. Null unless `source_type` is `dataset`, and
  -- null again once that dataset is deleted.
  dataset_id uuid,
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
  -- Keeps the install in the binding's workspace, and deletes the binding
  -- with the install.
  constraint plugin_data_slot_bindings__installation_in_workspace_fkey foreign key (installation_id, workspace_id) references public.plugin_installations (id, workspace_id) on update cascade on delete cascade,
  -- Keeps the case type in the binding's workspace. Deleting it clears only
  -- `concept_id`, which the client reads as a broken binding. A null
  -- `concept_id` skips the key.
  constraint plugin_data_slot_bindings__concept_in_workspace_fkey foreign key (concept_id, workspace_id) references public.concepts (id, workspace_id) on update cascade on delete set null (concept_id),
  -- Keeps the dataset in the binding's workspace. Deleting it clears only
  -- `dataset_id`.
  constraint plugin_data_slot_bindings__dataset_in_workspace_fkey foreign key (dataset_id, workspace_id) references public.datasets (id, workspace_id) on update cascade on delete set null (dataset_id),
  -- One binding per slot of an install. Its index also serves every lookup
  -- of an install's bindings.
  constraint plugin_data_slot_bindings__installation_slot_unique unique (installation_id, slot_id)
);

alter table public.plugin_data_slot_bindings enable row level security;

-- Data API privileges. `anon` is intentionally omitted. `authenticated` may
-- update only what a rebind changes, so a binding can never move to another
-- workspace or install. `bound_by` is listed because the save rpc writes it,
-- though the stamp trigger always overwrites it.
grant
select
,
  insert,
  delete on table public.plugin_data_slot_bindings to authenticated;

grant
update (
  source_type,
  concept_id,
  dataset_id,
  attribute_map,
  bound_by
) on table public.plugin_data_slot_bindings to authenticated;

grant
select
,
  insert,
update,
delete on table public.plugin_data_slot_bindings to service_role;

-- Serve the foreign key checks and delete cascades. The unique index on
-- `(installation_id, slot_id)` already covers `installation_id`.
create index idx_plugin_data_slot_bindings__workspace_id on public.plugin_data_slot_bindings (workspace_id);

create index idx_plugin_data_slot_bindings__concept_id on public.plugin_data_slot_bindings (concept_id);

create index idx_plugin_data_slot_bindings__dataset_id on public.plugin_data_slot_bindings (dataset_id);

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
