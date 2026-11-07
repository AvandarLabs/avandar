/**
 * Replaces a case type's statuses with `p_statuses` in one transaction,
 * moving records off removed statuses first.
 *
 * SECURITY DEFINER because it moves records between statuses for a Case
 * Types editor who may not be a Case Records editor, which
 * `tr_individuals__check_status_change` would otherwise refuse. It checks
 * Case Types editor itself, against the case type's own workspace, before it
 * reads or writes anything else. Every refusal raises with a stable `hint`
 * that the client maps to copy.
 *
 * @param p_concept_id The case type whose statuses are replaced.
 * @param p_statuses The full desired set, as an array of
 *   `{ id, name, description, color, position }`. New ids are inserted,
 *   saved ids are updated, and saved statuses missing from the array are
 *   deleted.
 * @param p_default_status_id The status new records start in. Must be in
 *   `p_statuses`.
 * @param p_replacements `{ "<removed id>": "<replacement id>" }`. Required
 *   for every removed status that records still use.
 */
create or replace function public.rpc_concept_statuses__save (
  p_concept_id uuid,
  p_statuses jsonb,
  p_default_status_id uuid,
  p_replacements jsonb
) returns void language plpgsql security definer
set
  search_path = '' as $$
declare
  v_workspace_id uuid;
  v_status_count integer;
  v_replacements jsonb := coalesce(p_replacements, '{}'::jsonb);
begin
  -- Read without a lock: the caller has not been authorized yet, and a lock
  -- would let any signed-in user block another workspace's case type.
  select c.workspace_id
  into v_workspace_id
  from public.concepts c
  where c.id = p_concept_id;

  -- A missing case type and a forbidden one raise the same error, so the
  -- function cannot be used to probe for case type ids.
  if v_workspace_id is null or not public.util__auth_user_meets_min_app_role (
    v_workspace_id,
    'case_types'::public.app_type,
    'editor'::public.role_level
  ) then
    raise exception 'Only Case Types editors can change a case type''s statuses'
      using errcode = '42501', hint = 'case_types_editor_required';
  end if;

  -- Locks the case type once the caller is authorized, so two saves of its
  -- statuses run one at a time.
  perform 1 from public.concepts where id = p_concept_id for update;

  if jsonb_typeof(p_statuses) is distinct from 'array' then
    v_status_count := 0;
  else
    v_status_count := jsonb_array_length(p_statuses);
  end if;

  if v_status_count = 0 then
    raise exception 'A case type needs at least one status'
      using errcode = '23514', hint = 'status_set_empty';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_statuses) as s (name text)
    where coalesce(btrim(s.name), '') = ''
  ) then
    raise exception 'Every status needs a name'
      using errcode = '23514', hint = 'status_name_required';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_statuses) as s (name text)
    group by lower(btrim(s.name))
    having count(*) > 1
  ) then
    raise exception 'Two statuses of one case type cannot share a name'
      using errcode = '23505', hint = 'status_names_not_unique';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_statuses) as s (color text)
    where s.color is null or s.color !~ '^#[0-9a-f]{6}$'
  ) then
    raise exception 'Status colors must be lowercase #rrggbb'
      using errcode = '23514', hint = 'status_color_invalid';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_statuses) as s (id uuid)
    left join public.concept_statuses cs on cs.id = s.id
    where s.id is null or cs.concept_id <> p_concept_id
  ) then
    raise exception 'Every status must be new or belong to this case type'
      using errcode = '23514', hint = 'status_not_in_case_type';
  end if;

  if not exists (
    select 1
    from jsonb_to_recordset(p_statuses) as s (id uuid)
    where s.id = p_default_status_id
  ) then
    raise exception 'The default status must be one of the case type''s statuses'
      using errcode = '23514', hint = 'status_default_not_in_set';
  end if;

  if exists (
    select 1
    from jsonb_each_text(v_replacements) as r (removed_id, replacement_id)
    where not exists (
      select 1
      from jsonb_to_recordset(p_statuses) as s (id uuid)
      where s.id::text = r.replacement_id
    )
  ) then
    raise exception 'Records can only move to a status that is being kept'
      using errcode = '23514', hint = 'status_replacement_not_in_set';
  end if;

  if exists (
    select 1
    from public.concept_statuses cs
    where
      cs.concept_id = p_concept_id and
      not exists (
        select 1
        from jsonb_to_recordset(p_statuses) as s (id uuid)
        where s.id = cs.id
      ) and
      exists (
        select 1
        from public.individuals i
        where i.concept_id = p_concept_id and i.status_id = cs.id
      ) and
      v_replacements ->> cs.id::text is null
  ) then
    raise exception 'Records still use a removed status. Choose where they move.'
      using errcode = '23514', hint = 'status_replacement_required';
  end if;

  -- Park every saved name under a unique placeholder first, so a save that
  -- swaps two names, or gives a new status a removed status's name, never
  -- meets the unique name index partway through.
  update public.concept_statuses cs
  set name = '~' || cs.id::text
  where cs.concept_id = p_concept_id;

  insert into public.concept_statuses (
    id,
    workspace_id,
    concept_id,
    name,
    description,
    color,
    position
  )
  select
    s.id,
    v_workspace_id,
    p_concept_id,
    btrim(s.name),
    nullif(btrim(s.description), ''),
    s.color,
    s.position
  from jsonb_to_recordset(p_statuses) as s (
    id uuid,
    name text,
    description text,
    color text,
    position integer
  )
  on conflict (id) do update
  set
    name = excluded.name,
    description = excluded.description,
    color = excluded.color,
    position = excluded.position;

  update public.concepts
  set default_status_id = p_default_status_id
  where id = p_concept_id;

  -- Runs as the function owner, so `tr_individuals__check_status_change`
  -- lets these updates through for a Case Types editor.
  update public.individuals i
  set status_id = (v_replacements ->> i.status_id::text)::uuid
  where
    i.concept_id = p_concept_id and
    not exists (
      select 1
      from jsonb_to_recordset(p_statuses) as s (id uuid)
      where s.id = i.status_id
    );

  delete from public.concept_statuses cs
  where
    cs.concept_id = p_concept_id and
    not exists (
      select 1
      from jsonb_to_recordset(p_statuses) as s (id uuid)
      where s.id = cs.id
    );
end;
$$;

revoke
execute on function public.rpc_concept_statuses__save (uuid, jsonb, uuid, jsonb)
from
  public,
  anon,
  authenticated,
  service_role;

-- `authenticated` only. The function checks Case Types editor itself.
grant
execute on function public.rpc_concept_statuses__save (uuid, jsonb, uuid, jsonb) to authenticated;
