create table public.datasets__google_sheets (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Dataset this metadata belongs to
  dataset_id uuid not null unique references public.datasets (id) on update cascade on delete cascade,
  -- Workspace this dataset belongs to
  workspace_id uuid not null references public.workspaces (id) on update cascade on delete cascade,
  -- Timestamp of when the dataset was created.
  created_at timestamptz not null default now(),
  -- Timestamp of when this row was last updated.
  updated_at timestamptz not null default now(),
  -- Google account id associated with this dataset for
  -- google authentication. Do not allow deletion of a token
  -- if it is still associated to a dataset, otherwise the
  -- dataset will become inaccessible to the workspace.
  -- Ownership should be transferred to another google account first.
  google_account_id text not null references public.tokens__google (google_account_id) on update cascade on delete no action,
  -- The google sheet id
  google_document_id text not null,
  -- Number of rows to skip at the start of the file
  rows_to_skip integer not null default 0
);

-- Enable row level security
alter table public.datasets__google_sheets enable row level security;

-- Data API privileges.
grant
select
,
  insert,
update,
delete on table public.datasets__google_sheets to authenticated,
service_role;

-- Policies
create policy "User can select datasets__google_sheets in their workspace" on public.datasets__google_sheets for
select
  to authenticated using (
    public.util__auth_user_can_access_resource (
      'dataset',
      public.datasets__google_sheets.dataset_id,
      'viewer'
    )
  );

create policy "User can insert datasets__google_sheets in their workspace" on public.datasets__google_sheets for insert to authenticated
with
  check (
    public.util__auth_user_can_access_resource (
      'dataset',
      public.datasets__google_sheets.dataset_id,
      'editor'
    )
  );

create policy "User can update datasets__google_sheets in their workspace" on public.datasets__google_sheets
for update
  to authenticated using (
    public.util__auth_user_can_access_resource (
      'dataset',
      public.datasets__google_sheets.dataset_id,
      'editor'
    )
  )
with
  check (
    public.util__auth_user_can_access_resource (
      'dataset',
      public.datasets__google_sheets.dataset_id,
      'editor'
    )
  );

create policy "User can delete datasets__google_sheets in their workspace" on public.datasets__google_sheets for delete to authenticated using (
  public.util__auth_user_can_access_resource (
    'dataset',
    public.datasets__google_sheets.dataset_id,
    'admin'
  )
);

/**
 * Trigger the `updated_at` update.
 */
create trigger tr_datasets__google_sheets__set_updated_at before
update on public.datasets__google_sheets for each row
execute function public.util__set_updated_at ();
