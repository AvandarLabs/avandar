/**
 * One status a case type's records can be in, such as Active or Confirmed.
 * Each case type owns an ordered set and names one of them as the default
 * for new records in `concepts.default_status_id`.
 *
 * `individuals.status_id` and `concepts.default_status_id` both reference
 * `(id, concept_id)`, so a record or a case type can only point at a status
 * of its own case type.
 */
create table public.concept_statuses (
  -- Primary key. The client generates it when it builds a new status.
  id uuid primary key default gen_random_uuid(),
  -- Workspace this status belongs to. Always its case type's workspace.
  workspace_id uuid not null references public.workspaces (id) on update cascade on delete cascade,
  -- Case type this status belongs to. Deleting the case type deletes it.
  concept_id uuid not null references public.concepts (id) on update cascade on delete cascade,
  -- Display name, trimmed. Unique per case type, ignoring case.
  name text not null,
  -- What the status means, shown to the people working the records.
  description text,
  -- Display color as lowercase `#rrggbb`.
  color text not null,
  -- Display order within the case type, ascending. Not unique, so a reorder
  -- never trips a constraint partway through a statement.
  position integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint concept_statuses__name_trimmed_not_blank check (
    name = btrim(name) and
    name <> ''
  ),
  constraint concept_statuses__color_hex check (color ~ '^#[0-9a-f]{6}$'),
  -- The target of the composite foreign keys from `individuals` and
  -- `concepts`.
  constraint concept_statuses__id_concept_id_unique unique (id, concept_id)
);

-- Enable row level security
alter table public.concept_statuses enable row level security;

-- Data API privileges.
grant
select
,
  insert,
update,
delete on table public.concept_statuses to authenticated,
service_role;

-- Reads follow workspace membership, like every other ontology table.
create policy "User can SELECT concept_statuses in their workspace" on public.concept_statuses for
select
  to authenticated using (
    public.concept_statuses.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  );

-- Writes need Case Types editor. The status's workspace must also be its
-- case type's workspace, so nobody can attach a status to a case type in a
-- workspace they cannot see.
create policy "Case Types editors can INSERT concept_statuses" on public.concept_statuses for insert to authenticated
with
  check (
    public.util__auth_user_meets_min_app_role (
      public.concept_statuses.workspace_id,
      'case_types'::public.app_type,
      'editor'::public.role_level
    ) and
    public.concept_statuses.workspace_id = (
      select
        c.workspace_id
      from
        public.concepts c
      where
        c.id = public.concept_statuses.concept_id
    )
  );

create policy "Case Types editors can UPDATE concept_statuses" on public.concept_statuses
for update
  to authenticated using (
    public.util__auth_user_meets_min_app_role (
      public.concept_statuses.workspace_id,
      'case_types'::public.app_type,
      'editor'::public.role_level
    )
  )
with
  check (
    public.util__auth_user_meets_min_app_role (
      public.concept_statuses.workspace_id,
      'case_types'::public.app_type,
      'editor'::public.role_level
    ) and
    public.concept_statuses.workspace_id = (
      select
        c.workspace_id
      from
        public.concepts c
      where
        c.id = public.concept_statuses.concept_id
    )
  );

create policy "Case Types editors can DELETE concept_statuses" on public.concept_statuses for delete to authenticated using (
  public.util__auth_user_meets_min_app_role (
    public.concept_statuses.workspace_id,
    'case_types'::public.app_type,
    'editor'::public.role_level
  )
);

create trigger tr_concept_statuses__set_updated_at before
update on public.concept_statuses for each row
execute function public.util__set_updated_at ();

-- Data Explorer filters and chat match statuses by name, so two statuses of
-- one case type may not differ only in case.
create unique index concept_statuses__concept_id_lower_name_unique on public.concept_statuses (concept_id, lower(name));

create index idx_concept_statuses__concept_id_position on public.concept_statuses (concept_id, position);

-- Declared here rather than in `10.concepts.sql` because it references this
-- table. Deferred so a case type and its statuses can be inserted in one
-- transaction.
alter table public.concepts
add constraint concepts__default_status_fkey foreign key (default_status_id, id) references public.concept_statuses (id, concept_id) deferrable initially deferred;
