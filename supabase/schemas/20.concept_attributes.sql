create type public.concept_attributes__mapping_type as enum('dataset_column', 'manual_entry');

create table public.concept_attributes (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Workspace this concept attribute belongs to
  workspace_id uuid not null references public.workspaces (id) on update cascade on delete cascade,
  concept_id uuid not null references concepts (id) on update cascade on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Discriminating columns
  data_type public.datasets__ava_data_type not null,
  mapping_type public.concept_attributes__mapping_type not null,
  -- Dimension-related columns
  is_label boolean not null,
  is_identifier boolean not null,
  is_array boolean not null,
  allow_manual_edit boolean not null
);

-- Enable row level security
alter table public.concept_attributes enable row level security;

-- Data API privileges.
grant
select
,
  insert,
update,
delete on table public.concept_attributes to authenticated,
service_role;

-- Policies
create policy "
  User can SELECT concept_attributes
" on public.concept_attributes for
select
  to authenticated using (
    public.concept_attributes.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  );

create policy "
  User can INSERT concept_attributes
" on public.concept_attributes for insert to authenticated
with
  check (
    public.concept_attributes.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  );

create policy "
  User can UPDATE concept_attributes
" on public.concept_attributes
for update
  to authenticated
with
  check (
    public.concept_attributes.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  );

create policy "
  User can DELETE concept_attributes
" on public.concept_attributes for delete to authenticated using (
  public.concept_attributes.workspace_id = any (
    array(
      select
        public.util__get_auth_user_workspaces ()
    )
  )
);

create trigger tr_concept_attribute__set_updated_at before
update on public.concept_attributes for each row
execute function public.util__set_updated_at ();

/**
 * Validates a concept's label and identifier attributes. A concept needs at
 * least one attribute with `is_label`, and each dataset that attributes are
 * mapped from needs exactly one with `is_identifier`.
 */
create or replace function public.concept_attributes__validate_label_and_identifiers () returns trigger as $$
begin
  -- Count label attributes for this concept
  if (
    select count(*)
    from public.concept_attributes
    where
      public.concept_attributes.concept_id = new.concept_id and
    	public.concept_attributes.is_label
  ) != 1 then
    raise exception 'There must be exactly one label attribute per concept';
  end if;

  -- For attributes mapped from datasets, ensure each source dataset
  -- is associated with exactly one identifier attribute.
  if exists(
    select 1
    from public.concept_attributes attribute
    join public.attribute_mappings__dataset_column dataset_col_mapping
      on attribute.id = dataset_col_mapping.concept_attribute_id
    where attribute.concept_id = new.concept_id
    group by dataset_col_mapping.dataset_id
    having
      count(
        case when attribute.is_identifier then 1 end
      ) != 1
  ) then
    raise exception 'Each dataset must have exactly one identifier attribute.';
  end if;
  return new;
end;
$$ language plpgsql;

-- Trigger-only. The trigger machinery does not consult EXECUTE, so no
-- Data API role needs a grant for the trigger to fire.
revoke
execute on function public.concept_attributes__validate_label_and_identifiers ()
from
  public,
  anon,
  authenticated,
  service_role;

-- Deliberately `after insert or update`. A concept's attributes are inserted in
-- bulk after the concept row itself, so a `before` trigger would count zero
-- attributes and raise. The cost is that a failure here has to be undone by the
-- caller: the frontend rolls the partial write back with DELETE requests.
create trigger tr_concept_attributes__validate_label_and_identifiers
after insert or
update on public.concept_attributes for each row
execute function public.concept_attributes__validate_label_and_identifiers ();

-- Indexes to improve performance
create index idx_concept_attributes__concept_id_workspace_id on public.concept_attributes (concept_id, workspace_id);
