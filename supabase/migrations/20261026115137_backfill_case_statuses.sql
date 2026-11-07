-- Gives every case type that predates per-case-type statuses its status set,
-- points every record at the status matching its old free-text `status`, and
-- renames attributes that collide with the built-in `status` column.
--
-- Hand-written because `db diff` never emits DML. It runs after the
-- migration that adds the nullable status columns and before the one that
-- requires them. Every step skips rows it already handled, so a re-run
-- changes nothing.
-- Every case type starts with Active, its default, and Inactive.
insert into
  public.concept_statuses (
    workspace_id,
    concept_id,
    name,
    description,
    color,
    position
  )
select
  c.workspace_id,
  c.id,
  defaults.name,
  defaults.description,
  defaults.color,
  defaults.position
from
  public.concepts c
  cross join (
    values
      ('Active', 'Open and being worked on.', '#40c057', 0),
      ('Inactive', 'No longer being worked on.', '#637c95', 1)
  ) as defaults (name, description, color, position)
where
  not exists (
    select
      1
    from
      public.concept_statuses cs
    where
      cs.concept_id = c.id
  );

-- Each other value a case type's records use becomes a neutral status after
-- Inactive, named with its first letter capitalized.
insert into
  public.concept_statuses (
    workspace_id,
    concept_id,
    name,
    color,
    position
  )
select
  extra.workspace_id,
  extra.concept_id,
  extra.name,
  '#637c95',
  1 + row_number() over (
    partition by
      extra.concept_id
    order by
      extra.name
  )
from
  (
    select distinct
      on (i.concept_id, lower(btrim(i.status))) c.workspace_id,
      i.concept_id,
      upper(left(btrim(i.status), 1)) || substr(btrim(i.status), 2) as name
    from
      public.individuals i
      join public.concepts c on c.id = i.concept_id
    where
      btrim(i.status) <> '' and
      lower(btrim(i.status)) not in ('active', 'inactive')
    order by
      i.concept_id,
      lower(btrim(i.status)),
      i.status
  ) as extra
where
  not exists (
    select
      1
    from
      public.concept_statuses cs
    where
      cs.concept_id = extra.concept_id and
      lower(cs.name) = lower(extra.name)
  );

-- Active is every existing case type's default.
update public.concepts c
set
  default_status_id = cs.id
from
  public.concept_statuses cs
where
  cs.concept_id = c.id and
  cs.name = 'Active' and
  c.default_status_id is null;

-- Each record takes the status whose name matches its old text, ignoring
-- case and surrounding whitespace. A blank status takes the default.
update public.individuals i
set
  status_id = coalesce(
    (
      select
        cs.id
      from
        public.concept_statuses cs
      where
        cs.concept_id = i.concept_id and
        lower(cs.name) = lower(btrim(i.status))
    ),
    c.default_status_id
  )
from
  public.concepts c
where
  c.id = i.concept_id and
  i.status_id is null;

-- The Data Explorer gives every case type a built-in `status` column, so an
-- attribute with that name would collide with it.
update public.concept_attributes
set
  name = btrim(name) || ' (attribute)'
where
  lower(btrim(name)) = 'status';
