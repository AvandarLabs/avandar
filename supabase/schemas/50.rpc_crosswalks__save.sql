/**
 * Replaces one crosswalk's settings, the columns of its combined dataset,
 * its layouts, its dataset memberships, and its mappings with the given
 * sets in one transaction.
 *
 * SECURITY DEFINER because the four child tables are select-only for
 * signed-in users: this function is their only write path. It checks Data
 * Sources editor on the crosswalk's own workspace before it reads anything
 * else, and locks the crosswalk so two saves run one at a time. Every
 * refusal raises with a stable `hint` that the client maps to copy.
 *
 * Columns, layouts, and mappings are upserted by id, and the ones left out
 * are deleted (a layout only after the memberships are written). A null set
 * is refused, never read as empty. Memberships are upserted by dataset, and one left out is
 * deleted only when the caller can view its dataset, so a save never
 * removes a dataset the caller cannot see. For the same reason, a layout
 * that holds such a membership must stay in the set.
 *
 * @param p_crosswalk_id The crosswalk whose contents are replaced.
 * @param p_settings `{ name, description, codes_output_as,
 *   adds_source_column }`.
 * @param p_columns The full set, as `[{ id, name, position, data_type,
 *   entry_id }]`.
 * @param p_layouts The full set, as `[{ id, signature, column_names,
 *   is_reference, status }]`.
 * @param p_datasets Every membership the caller can view, as
 *   `[{ dataset_id, layout_id }]`.
 * @param p_mappings The full set, as `[{ id, layout_id, column_id, fill,
 *   status, confidence, reason }]`, where `fill` is a stored fill.
 */
create or replace function public.rpc_crosswalks__save (
  p_crosswalk_id uuid,
  p_settings jsonb,
  p_columns jsonb,
  p_layouts jsonb,
  p_datasets jsonb,
  p_mappings jsonb
) returns void language plpgsql security definer
set
  search_path = '' as $$
declare
  v_workspace_id uuid;
begin
  v_workspace_id := public.crosswalks__authorize (p_crosswalk_id);

  perform public.crosswalks__check_payload (p_settings, p_columns, p_layouts, p_datasets, p_mappings);
  perform public.crosswalks__check_columns (p_crosswalk_id, v_workspace_id, p_settings, p_columns);
  perform public.crosswalks__check_layouts (p_crosswalk_id, p_layouts);
  perform public.crosswalks__check_datasets (p_crosswalk_id, v_workspace_id, p_layouts, p_datasets);
  perform public.crosswalks__check_mappings (p_crosswalk_id, p_columns, p_layouts, p_mappings);

  -- Layouts are deleted only after the memberships are moved, so a dataset
  -- moved out of a dropped layout keeps its membership.
  perform public.crosswalks__write_columns (p_crosswalk_id, v_workspace_id, p_columns);
  perform public.crosswalks__write_layouts (p_crosswalk_id, v_workspace_id, p_layouts);
  perform public.crosswalks__write_datasets (p_crosswalk_id, v_workspace_id, p_datasets);
  perform public.crosswalks__delete_left_out_layouts (p_crosswalk_id, p_layouts);
  perform public.crosswalks__write_mappings (p_crosswalk_id, v_workspace_id, p_mappings);

  -- Always written, so `updated_at` moves on every save.
  update public.crosswalks
  set
    name = btrim(p_settings ->> 'name'),
    description = nullif(btrim(p_settings ->> 'description'), ''),
    codes_output_as = (p_settings ->> 'codes_output_as')::public.crosswalks__codes_output,
    adds_source_column = (p_settings ->> 'adds_source_column')::boolean
  where id = p_crosswalk_id;
end;
$$;

/**
 * Raises `crosswalk_payload_invalid` unless the settings carry every field
 * with the right type and each set is an array of objects with
 * well-formed fields, then raises `crosswalk_name_required` for a blank
 * name. Called only by `rpc_crosswalks__save`.
 */
create or replace function public.crosswalks__check_payload (
  p_settings jsonb,
  p_columns jsonb,
  p_layouts jsonb,
  p_datasets jsonb,
  p_mappings jsonb
) returns void language plpgsql
set
  search_path = '' as $$
begin
  if
    jsonb_typeof(p_settings) is distinct from 'object' or
    jsonb_typeof(p_settings -> 'name') is distinct from 'string' or
    jsonb_typeof(coalesce(p_settings -> 'description', 'null'::jsonb)) not in ('string', 'null') or
    coalesce(p_settings ->> 'codes_output_as', '') <> all (
      enum_range(null::public.crosswalks__codes_output)::text[]
    ) or
    jsonb_typeof(p_settings -> 'adds_source_column') is distinct from 'boolean'
  then
    raise exception 'Settings need a name, a description, how codes come out, and whether a source column is added'
      using errcode = '22023', hint = 'crosswalk_payload_invalid';
  end if;

  if exists (
    select 1
    from (values (p_columns), (p_layouts), (p_datasets), (p_mappings)) as s (items)
    where jsonb_typeof(s.items) is distinct from 'array'
  ) then
    raise exception 'Columns, layouts, datasets, and mappings must be arrays'
      using errcode = '22023', hint = 'crosswalk_payload_invalid';
  end if;

  -- Only now is every set known to be an array.
  if exists (
    select 1
    from (values (p_columns), (p_layouts), (p_datasets), (p_mappings)) as s (items)
    cross join lateral jsonb_array_elements(s.items) as e (item)
    where jsonb_typeof(e.item) <> 'object'
  ) then
    raise exception 'Every column, layout, dataset, and mapping must be an object'
      using errcode = '22023', hint = 'crosswalk_payload_invalid';
  end if;

  perform public.crosswalks__check_column_fields (p_columns);
  perform public.crosswalks__check_layout_fields (p_layouts);
  perform public.crosswalks__check_membership_and_mapping_fields (p_datasets, p_mappings);

  if btrim(p_settings ->> 'name') = '' then
    raise exception 'A crosswalk needs a name'
      using errcode = '23514', hint = 'crosswalk_name_required';
  end if;
end;
$$;

/**
 * Raises `crosswalk_payload_invalid` unless every column has a uuid id, a
 * text name, a whole-number position from 0 to 10000, a known type, and a uuid or null
 * entry, with no id twice. Runs before anything casts the columns.
 */
create or replace function public.crosswalks__check_column_fields (p_columns jsonb) returns void language plpgsql
set
  search_path = '' as $$
declare
  v_uuid_pattern constant text :=
    '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
begin
  if exists (
    select 1
    from jsonb_array_elements(p_columns) as e (col)
    where
      coalesce(e.col ->> 'id', '') !~* v_uuid_pattern or
      jsonb_typeof(e.col -> 'name') is distinct from 'string' or
      jsonb_typeof(e.col -> 'position') is distinct from 'number' or
      coalesce(e.col ->> 'position', '') !~ '^([0-9]{1,4}|10000)$' or
      coalesce(e.col ->> 'data_type', '') <> all (
        enum_range(null::public.datasets__ava_data_type)::text[]
      ) or
      (e.col ->> 'entry_id') !~* v_uuid_pattern
  ) then
    raise exception 'Every column needs an id, a name, a whole-number position, and a known type'
      using errcode = '22023', hint = 'crosswalk_payload_invalid';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_columns) as e (col)
    group by lower(e.col ->> 'id')
    having count(*) > 1
  ) then
    raise exception 'A column id appears more than once'
      using errcode = '22023', hint = 'crosswalk_payload_invalid';
  end if;
end;
$$;

/**
 * Raises `crosswalk_payload_invalid` unless every layout has a uuid id, a
 * signature, a non-empty list of text column names, a boolean
 * `is_reference`, and a known status, with no id twice. Runs before
 * anything casts the layouts.
 */
create or replace function public.crosswalks__check_layout_fields (p_layouts jsonb) returns void language plpgsql
set
  search_path = '' as $$
declare
  v_uuid_pattern constant text :=
    '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
begin
  if exists (
    select 1
    from jsonb_array_elements(p_layouts) as e (layout)
    where
      coalesce(e.layout ->> 'id', '') !~* v_uuid_pattern or
      jsonb_typeof(e.layout -> 'signature') is distinct from 'string' or
      btrim(coalesce(e.layout ->> 'signature', '')) = '' or
      jsonb_typeof(e.layout -> 'column_names') is distinct from 'array' or
      jsonb_typeof(e.layout -> 'is_reference') is distinct from 'boolean' or
      coalesce(e.layout ->> 'status', '') <> all (
        enum_range(null::public.crosswalks__layout_status)::text[]
      )
  ) then
    raise exception 'Every layout needs an id, a signature, column names, a reference flag, and a known status'
      using errcode = '22023', hint = 'crosswalk_payload_invalid';
  end if;

  -- Only now is every `column_names` known to be an array.
  if exists (
    select 1
    from jsonb_array_elements(p_layouts) as e (layout)
    where
      jsonb_array_length(e.layout -> 'column_names') = 0 or
      exists (
        select 1
        from jsonb_array_elements(e.layout -> 'column_names') as n (column_name)
        where jsonb_typeof(n.column_name) <> 'string'
      )
  ) then
    raise exception 'Every layout needs at least one column name, each a text'
      using errcode = '22023', hint = 'crosswalk_payload_invalid';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_layouts) as e (layout)
    group by lower(e.layout ->> 'id')
    having count(*) > 1
  ) then
    raise exception 'A layout id appears more than once'
      using errcode = '22023', hint = 'crosswalk_payload_invalid';
  end if;
end;
$$;

/**
 * Raises `crosswalk_payload_invalid` unless every membership names a uuid
 * dataset and layout, with no dataset twice, and every mapping has a uuid
 * id, layout, and column, a known status, a known or null reason, and a
 * null confidence or one from 0 to 1, with no id twice. The fill is
 * checked later, with its own hint.
 */
create or replace function public.crosswalks__check_membership_and_mapping_fields (p_datasets jsonb, p_mappings jsonb) returns void language plpgsql
set
  search_path = '' as $$
declare
  v_uuid_pattern constant text :=
    '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
begin
  if exists (
    select 1
    from jsonb_array_elements(p_datasets) as e (membership)
    where
      coalesce(e.membership ->> 'dataset_id', '') !~* v_uuid_pattern or
      coalesce(e.membership ->> 'layout_id', '') !~* v_uuid_pattern
  ) or exists (
    select 1
    from jsonb_array_elements(p_datasets) as e (membership)
    group by lower(e.membership ->> 'dataset_id')
    having count(*) > 1
  ) then
    raise exception 'Every dataset needs a layout, and joins the crosswalk once'
      using errcode = '22023', hint = 'crosswalk_payload_invalid';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_mappings) as e (mapping)
    where
      coalesce(e.mapping ->> 'id', '') !~* v_uuid_pattern or
      coalesce(e.mapping ->> 'layout_id', '') !~* v_uuid_pattern or
      coalesce(e.mapping ->> 'column_id', '') !~* v_uuid_pattern or
      coalesce(e.mapping ->> 'status', '') <> all (
        enum_range(null::public.crosswalks__mapping_status)::text[]
      ) or
      (e.mapping ->> 'reason') <> all (
        enum_range(null::public.crosswalks__mapping_reason)::text[]
      ) or
      case jsonb_typeof(coalesce(e.mapping -> 'confidence', 'null'::jsonb))
        when 'null' then false
        when 'number' then (e.mapping ->> 'confidence')::numeric not between 0 and 1
        else true
      end
  ) or exists (
    select 1
    from jsonb_array_elements(p_mappings) as e (mapping)
    group by lower(e.mapping ->> 'id')
    having count(*) > 1
  ) then
    raise exception 'Every mapping needs an id, a layout, a column, a known status and reason, and a confidence from 0 to 1'
      using errcode = '22023', hint = 'crosswalk_payload_invalid';
  end if;
end;
$$;

/**
 * Raises with a stable hint when a set of columns cannot be saved into a
 * crosswalk: an id another crosswalk owns, a blank name, two names equal
 * ignoring case and spaces, a column named like the source column while
 * the crosswalk adds one, or an entry from outside the workspace.
 */
create or replace function public.crosswalks__check_columns (
  p_crosswalk_id uuid,
  p_workspace_id uuid,
  p_settings jsonb,
  p_columns jsonb
) returns void language plpgsql
set
  search_path = '' as $$
begin
  if exists (
    select 1
    from jsonb_to_recordset(p_columns) as c (id uuid)
    join public.crosswalks__columns cc on cc.id = c.id
    where cc.crosswalk_id <> p_crosswalk_id
  ) then
    raise exception 'Every column must be new or belong to this crosswalk'
      using errcode = '23514', hint = 'item_not_in_crosswalk';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_columns) as c (name text)
    where btrim(c.name) = ''
  ) then
    raise exception 'Every column needs a name'
      using errcode = '23514', hint = 'column_name_required';
  end if;

  -- `source_dataset` is `CrosswalkModule.SOURCE_COLUMN_NAME`, the column
  -- the combined dataset starts with when `adds_source_column` is on.
  if exists (
    select 1
    from jsonb_to_recordset(p_columns) as c (name text)
    group by lower(btrim(c.name))
    having count(*) > 1
  ) or (
    (p_settings ->> 'adds_source_column')::boolean and exists (
      select 1
      from jsonb_to_recordset(p_columns) as c (name text)
      where lower(btrim(c.name)) = 'source_dataset'
    )
  ) then
    raise exception 'Two columns of the combined dataset cannot share a name'
      using errcode = '23505', hint = 'column_names_not_unique';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_columns) as c (entry_id uuid)
    where
      c.entry_id is not null and
      not exists (
        select 1
        from public.data_dictionaries__entries en
        where en.id = c.entry_id and en.workspace_id = p_workspace_id
      )
  ) then
    raise exception 'A column''s entry must belong to a dictionary in this workspace'
      using errcode = '23514', hint = 'entry_not_in_workspace';
  end if;
end;
$$;

/**
 * Raises with a stable hint when a set of layouts cannot be saved into a
 * crosswalk: an id another crosswalk owns, two layouts with one
 * signature, or, when there are layouts, anything but exactly one
 * reference layout that is mapped.
 */
create or replace function public.crosswalks__check_layouts (p_crosswalk_id uuid, p_layouts jsonb) returns void language plpgsql
set
  search_path = '' as $$
begin
  if exists (
    select 1
    from jsonb_to_recordset(p_layouts) as l (id uuid)
    join public.crosswalks__layouts cl on cl.id = l.id
    where cl.crosswalk_id <> p_crosswalk_id
  ) then
    raise exception 'Every layout must be new or belong to this crosswalk'
      using errcode = '23514', hint = 'item_not_in_crosswalk';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_layouts) as l (signature text)
    group by l.signature
    having count(*) > 1
  ) then
    raise exception 'Two layouts of one crosswalk cannot share a signature'
      using errcode = '23505', hint = 'layout_signatures_not_unique';
  end if;

  -- A crosswalk with no datasets yet has no layouts, and no reference.
  if jsonb_array_length(p_layouts) > 0 and (
    (
      select count(*)
      from jsonb_to_recordset(p_layouts) as l (is_reference boolean)
      where l.is_reference
    ) <> 1 or
    exists (
      select 1
      from jsonb_to_recordset(p_layouts) as l (is_reference boolean, status text)
      where l.is_reference and l.status <> 'mapped'
    )
  ) then
    raise exception 'A crosswalk with layouts has exactly one reference layout, and it is mapped'
      using errcode = '23514', hint = 'reference_layout_required';
  end if;
end;
$$;

/**
 * Raises with a stable hint when a set of memberships cannot be saved: one
 * names a layout that is not in the set, or a dataset that is missing, in
 * another workspace, or one the caller cannot view, or is any crosswalk's
 * combined dataset. Also refuses a set of
 * layouts that leaves out a layout still holding a membership the caller
 * cannot view, because deleting the layout would delete that membership.
 */
create or replace function public.crosswalks__check_datasets (
  p_crosswalk_id uuid,
  p_workspace_id uuid,
  p_layouts jsonb,
  p_datasets jsonb
) returns void language plpgsql
set
  search_path = '' as $$
begin
  if exists (
    select 1
    from jsonb_to_recordset(p_datasets) as d (layout_id uuid)
    where not exists (
      select 1
      from jsonb_to_recordset(p_layouts) as l (id uuid)
      where l.id = d.layout_id
    )
  ) then
    raise exception 'Every dataset must join a layout saved with it'
      using errcode = '23514', hint = 'item_not_in_crosswalk';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_datasets) as d (dataset_id uuid)
    left join public.datasets ds on ds.id = d.dataset_id and ds.workspace_id = p_workspace_id
    where
      ds.id is null or
      not public.util__auth_user_can_access_resource (
        'dataset'::public.resource_type,
        d.dataset_id,
        'viewer'::public.role_level
      )
  ) then
    raise exception 'Every dataset must be one you can open in this workspace'
      using errcode = '42501', hint = 'dataset_not_readable';
  end if;

  -- A combined dataset reads every member, so no crosswalk's combined
  -- dataset can be one: two crosswalks could otherwise feed each other.
  if exists (
    select 1
    from jsonb_to_recordset(p_datasets) as d (dataset_id uuid)
    join public.crosswalks c on c.output_dataset_id = d.dataset_id
  ) then
    raise exception 'A combined dataset cannot be one of the datasets a crosswalk combines'
      using errcode = '23514', hint = 'output_dataset_in_crosswalk';
  end if;

  if exists (
    select 1
    from public.crosswalks__datasets cd
    where
      cd.crosswalk_id = p_crosswalk_id and
      not exists (
        select 1
        from jsonb_to_recordset(p_layouts) as l (id uuid)
        where l.id = cd.layout_id
      ) and
      not public.util__auth_user_can_access_resource (
        'dataset'::public.resource_type,
        cd.dataset_id,
        'viewer'::public.role_level
      )
  ) then
    raise exception 'A layout this save removes still holds a dataset you cannot open'
      using errcode = '42501', hint = 'dataset_not_readable';
  end if;
end;
$$;

/**
 * Raises with a stable hint when a set of mappings cannot be saved: an id
 * another crosswalk owns, a layout or column not in the set, two mappings
 * for one layout and column, or a fill that is not a valid version 1
 * fill.
 */
create or replace function public.crosswalks__check_mappings (
  p_crosswalk_id uuid,
  p_columns jsonb,
  p_layouts jsonb,
  p_mappings jsonb
) returns void language plpgsql
set
  search_path = '' as $$
begin
  if exists (
    select 1
    from jsonb_to_recordset(p_mappings) as m (id uuid)
    join public.crosswalks__mappings cm on cm.id = m.id
    where cm.crosswalk_id <> p_crosswalk_id
  ) or exists (
    select 1
    from jsonb_to_recordset(p_mappings) as m (layout_id uuid, column_id uuid)
    where
      not exists (
        select 1
        from jsonb_to_recordset(p_layouts) as l (id uuid)
        where l.id = m.layout_id
      ) or
      not exists (
        select 1
        from jsonb_to_recordset(p_columns) as c (id uuid)
        where c.id = m.column_id
      )
  ) then
    raise exception 'Every mapping must be new or belong to this crosswalk, and fill a column saved with it for a layout saved with it'
      using errcode = '23514', hint = 'item_not_in_crosswalk';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_mappings) as m (layout_id uuid, column_id uuid)
    group by m.layout_id, m.column_id
    having count(*) > 1
  ) then
    raise exception 'A layout fills each column once'
      using errcode = '23505', hint = 'mappings_not_unique';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_mappings) as e (mapping)
    where not public.crosswalks__is_fill_valid (e.mapping -> 'fill')
  ) then
    raise exception 'Every fill must be a version 1 fill of a known kind'
      using errcode = '22023', hint = 'fill_invalid';
  end if;
end;
$$;

/**
 * Whether a stored fill is a valid version 1 fill: an object with
 * `version` 1 and a known `kind`, where a `column` fill names a non-blank
 * `source_column`, a `constant` has a text `value`, and an `expression`
 * has non-blank `sql`. A `pad_text` conversion pads to a length from 1 to
 * 64. The browser's versioned parser checks the rest.
 */
create or replace function public.crosswalks__is_fill_valid (p_fill jsonb) returns boolean language sql immutable
set
  search_path = '' as $$
  select coalesce(
    jsonb_typeof(p_fill) = 'object' and
    p_fill -> 'version' = '1'::jsonb and
    case p_fill ->> 'kind'
      when 'column' then
        jsonb_typeof(p_fill -> 'source_column') = 'string' and
        btrim(p_fill ->> 'source_column') <> '' and
        (
          coalesce(p_fill -> 'convert' ->> 'kind', '') <> 'pad_text' or
          (
            jsonb_typeof(p_fill -> 'convert' -> 'length') = 'number' and
            (p_fill -> 'convert' ->> 'length') ~ '^([1-9]|[1-5][0-9]|6[0-4])$'
          )
        )
      when 'constant' then jsonb_typeof(p_fill -> 'value') = 'string'
      when 'expression' then
        jsonb_typeof(p_fill -> 'sql') = 'string' and
        btrim(p_fill ->> 'sql') <> ''
      when 'empty' then true
      else false
    end,
    false
  );
$$;

/** Upserts a crosswalk's columns and deletes the ones left out. */
create or replace function public.crosswalks__write_columns (
  p_crosswalk_id uuid,
  p_workspace_id uuid,
  p_columns jsonb
) returns void language plpgsql
set
  search_path = '' as $$
begin
  -- Park saved names under a unique placeholder first, so a save that swaps
  -- two names never meets the unique name index partway through.
  update public.crosswalks__columns c
  set name = '~' || c.id::text
  where c.crosswalk_id = p_crosswalk_id;

  insert into public.crosswalks__columns (id, workspace_id, crosswalk_id, name, position, data_type, entry_id)
  select
    c.id, p_workspace_id, p_crosswalk_id, btrim(c.name), c.position,
    c.data_type::public.datasets__ava_data_type, c.entry_id
  from jsonb_to_recordset(p_columns) as c (
    id uuid, name text, position integer, data_type text, entry_id uuid
  )
  on conflict (id) do update
  set
    name = excluded.name,
    position = excluded.position,
    data_type = excluded.data_type,
    entry_id = excluded.entry_id
  where public.crosswalks__columns.crosswalk_id = excluded.crosswalk_id;

  -- Their mappings go with them.
  delete from public.crosswalks__columns c
  where
    c.crosswalk_id = p_crosswalk_id and
    not exists (
      select 1
      from jsonb_to_recordset(p_columns) as pc (id uuid)
      where pc.id = c.id
    );
end;
$$;

/** Upserts a crosswalk's layouts. */
create or replace function public.crosswalks__write_layouts (
  p_crosswalk_id uuid,
  p_workspace_id uuid,
  p_layouts jsonb
) returns void language plpgsql
set
  search_path = '' as $$
begin
  -- Park saved signatures and clear the reference first, so a save that
  -- swaps two signatures or moves the reference never meets a unique
  -- index partway through.
  update public.crosswalks__layouts l
  set signature = '~' || l.id::text, is_reference = false
  where l.crosswalk_id = p_crosswalk_id;

  insert into public.crosswalks__layouts (id, workspace_id, crosswalk_id, signature, column_names, is_reference, status)
  select
    l.id, p_workspace_id, p_crosswalk_id, l.signature, l.column_names,
    l.is_reference, l.status::public.crosswalks__layout_status
  from jsonb_to_recordset(p_layouts) as l (
    id uuid, signature text, column_names text[], is_reference boolean, status text
  )
  on conflict (id) do update
  set
    signature = excluded.signature,
    column_names = excluded.column_names,
    is_reference = excluded.is_reference,
    status = excluded.status
  where public.crosswalks__layouts.crosswalk_id = excluded.crosswalk_id;
end;
$$;

/**
 * Deletes the crosswalk's layouts that the given set leaves out. Their
 * memberships and mappings go with them. The checks already refused
 * dropping a layout that holds a membership the caller cannot view, and the
 * memberships of the given set were moved off these layouts before this
 * runs.
 */
create or replace function public.crosswalks__delete_left_out_layouts (p_crosswalk_id uuid, p_layouts jsonb) returns void language plpgsql
set
  search_path = '' as $$
begin
  delete from public.crosswalks__layouts l
  where
    l.crosswalk_id = p_crosswalk_id and
    not exists (
      select 1
      from jsonb_to_recordset(p_layouts) as pl (id uuid)
      where pl.id = l.id
    );
end;
$$;

/**
 * Deletes the memberships left out whose dataset the caller can view, and
 * upserts the given ones by dataset, so a moved dataset keeps its
 * membership id. A membership the caller cannot view is never deleted.
 */
create or replace function public.crosswalks__write_datasets (
  p_crosswalk_id uuid,
  p_workspace_id uuid,
  p_datasets jsonb
) returns void language plpgsql
set
  search_path = '' as $$
begin
  delete from public.crosswalks__datasets cd
  where
    cd.crosswalk_id = p_crosswalk_id and
    not exists (
      select 1
      from jsonb_to_recordset(p_datasets) as d (dataset_id uuid)
      where d.dataset_id = cd.dataset_id
    ) and
    public.util__auth_user_can_access_resource (
      'dataset'::public.resource_type,
      cd.dataset_id,
      'viewer'::public.role_level
    );

  insert into public.crosswalks__datasets (workspace_id, crosswalk_id, dataset_id, layout_id)
  select p_workspace_id, p_crosswalk_id, d.dataset_id, d.layout_id
  from jsonb_to_recordset(p_datasets) as d (dataset_id uuid, layout_id uuid)
  on conflict (crosswalk_id, dataset_id) do update
  set layout_id = excluded.layout_id;
end;
$$;

/**
 * Deletes the mappings left out, and any whose layout or column the set
 * changes, then upserts the given ones by id. A mapping's layout and
 * column never change in place, so the unique `(layout_id, column_id)`
 * pair is never met partway through.
 */
create or replace function public.crosswalks__write_mappings (
  p_crosswalk_id uuid,
  p_workspace_id uuid,
  p_mappings jsonb
) returns void language plpgsql
set
  search_path = '' as $$
begin
  delete from public.crosswalks__mappings cm
  where
    cm.crosswalk_id = p_crosswalk_id and
    not exists (
      select 1
      from jsonb_to_recordset(p_mappings) as m (id uuid, layout_id uuid, column_id uuid)
      where m.id = cm.id and m.layout_id = cm.layout_id and m.column_id = cm.column_id
    );

  insert into public.crosswalks__mappings (
    id, workspace_id, crosswalk_id, layout_id, column_id, fill, status, confidence, reason
  )
  select
    m.id, p_workspace_id, p_crosswalk_id, m.layout_id, m.column_id, m.fill,
    m.status::public.crosswalks__mapping_status, m.confidence,
    m.reason::public.crosswalks__mapping_reason
  from jsonb_to_recordset(p_mappings) as m (
    id uuid, layout_id uuid, column_id uuid, fill jsonb, status text, confidence numeric, reason text
  )
  on conflict (id) do update
  set
    fill = excluded.fill,
    status = excluded.status,
    confidence = excluded.confidence,
    reason = excluded.reason
  where public.crosswalks__mappings.crosswalk_id = excluded.crosswalk_id;
end;
$$;

revoke
execute on function public.rpc_crosswalks__save (uuid, jsonb, jsonb, jsonb, jsonb, jsonb)
from
  public,
  anon,
  authenticated,
  service_role;

-- `authenticated` only. The function checks Data Sources editor itself.
grant
execute on function public.rpc_crosswalks__save (uuid, jsonb, jsonb, jsonb, jsonb, jsonb) to authenticated;

-- The helpers run inside the SECURITY DEFINER save and are never called
-- directly, so no Data API role gets EXECUTE.
revoke
execute on function public.crosswalks__check_payload (jsonb, jsonb, jsonb, jsonb, jsonb)
from
  public,
  anon,
  authenticated,
  service_role;

revoke
execute on function public.crosswalks__check_column_fields (jsonb)
from
  public,
  anon,
  authenticated,
  service_role;

revoke
execute on function public.crosswalks__check_layout_fields (jsonb)
from
  public,
  anon,
  authenticated,
  service_role;

revoke
execute on function public.crosswalks__check_membership_and_mapping_fields (jsonb, jsonb)
from
  public,
  anon,
  authenticated,
  service_role;

revoke
execute on function public.crosswalks__check_columns (uuid, uuid, jsonb, jsonb)
from
  public,
  anon,
  authenticated,
  service_role;

revoke
execute on function public.crosswalks__check_layouts (uuid, jsonb)
from
  public,
  anon,
  authenticated,
  service_role;

revoke
execute on function public.crosswalks__check_datasets (uuid, uuid, jsonb, jsonb)
from
  public,
  anon,
  authenticated,
  service_role;

revoke
execute on function public.crosswalks__check_mappings (uuid, jsonb, jsonb, jsonb)
from
  public,
  anon,
  authenticated,
  service_role;

revoke
execute on function public.crosswalks__is_fill_valid (jsonb)
from
  public,
  anon,
  authenticated,
  service_role;

revoke
execute on function public.crosswalks__write_columns (uuid, uuid, jsonb)
from
  public,
  anon,
  authenticated,
  service_role;

revoke
execute on function public.crosswalks__write_layouts (uuid, uuid, jsonb)
from
  public,
  anon,
  authenticated,
  service_role;

revoke
execute on function public.crosswalks__delete_left_out_layouts (uuid, jsonb)
from
  public,
  anon,
  authenticated,
  service_role;

revoke
execute on function public.crosswalks__write_datasets (uuid, uuid, jsonb)
from
  public,
  anon,
  authenticated,
  service_role;

revoke
execute on function public.crosswalks__write_mappings (uuid, uuid, jsonb)
from
  public,
  anon,
  authenticated,
  service_role;
