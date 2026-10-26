create table public.concepts (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- User id of the owner.
  owner_id uuid not null default auth.uid () references auth.users (id) on update cascade on delete no action,
  -- Workspace this concept belongs to
  workspace_id uuid not null references public.workspaces (id) on update cascade on delete cascade,
  -- Name of the concept
  name text not null,
  -- Optional description of the concept
  description text,
  -- Timestamp when the concept was created.
  created_at timestamptz not null default now(),
  -- Timestamp of the last update to the concept.
  updated_at timestamptz not null default now(),
  -- Whether users can manually create individuals of this concept.
  allow_manual_creation boolean not null,
  -- Status new records of this case type start in. Its foreign key is
  -- declared in `11.concept_statuses.sql`, which defines the target table.
  default_status_id uuid
);

-- Enable row level security
alter table public.concepts enable row level security;

-- Data API privileges.
grant
select
,
  insert,
update,
delete on table public.concepts to authenticated,
service_role;

-- Policies
create policy "User can SELECT concepts" on public.concepts for
select
  to authenticated using (
    public.concepts.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  );

-- Creating and editing a case type requires `case_types` editor, and deleting
-- one requires `case_types` admin. Reads stay open to every member so the Data
-- Explorer and chat can query case types.
create policy "
  User can INSERT concepts
" on public.concepts for insert to authenticated
with
  check (
    public.util__auth_user_meets_min_app_role (
      public.concepts.workspace_id,
      'case_types'::public.app_type,
      'editor'::public.role_level
    )
  );

create policy "User can UPDATE concepts" on public.concepts
for update
  to authenticated using (
    public.util__auth_user_meets_min_app_role (
      public.concepts.workspace_id,
      'case_types'::public.app_type,
      'editor'::public.role_level
    )
  )
with
  check (
    public.util__auth_user_meets_min_app_role (
      public.concepts.workspace_id,
      'case_types'::public.app_type,
      'editor'::public.role_level
    )
  );

create policy "
  User can DELETE concepts
" on public.concepts for delete to authenticated using (
  public.util__auth_user_meets_min_app_role (
    public.concepts.workspace_id,
    'case_types'::public.app_type,
    'admin'::public.role_level
  )
);

create trigger tr_concept__set_updated_at before
update on public.concepts for each row
execute function public.util__set_updated_at ();

-- Indexes to improve performance
create index idx_concepts__workspace_id on public.concepts (workspace_id);
