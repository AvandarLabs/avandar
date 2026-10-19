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
  rows_to_skip integer not null default 0,
  -- Name of the spreadsheet tab that backs this relation. Nullable when the
  -- default tab was used (e.g. the first tab in the workbook). Rows imported
  -- before this column existed carry null, which is what they already read:
  -- the import path took the first GRID tab.
  sheet_name text
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

-- The Google account named here must be the inserting user's own: everyone
-- who can see the dataset reads the sheet with that account's grant, so
-- naming someone else's account would read their files.
create policy "User can insert datasets__google_sheets in their workspace" on public.datasets__google_sheets for insert to authenticated
with
  check (
    public.util__auth_user_can_access_resource (
      'dataset',
      public.datasets__google_sheets.dataset_id,
      'editor'
    ) and
    exists (
      select
        1
      from
        public.tokens__google
      where
        public.tokens__google.google_account_id = public.datasets__google_sheets.google_account_id and
        public.tokens__google.user_id = (
          select
            auth.uid ()
        )
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

create trigger tr_datasets__google_sheets__set_updated_at before
update on public.datasets__google_sheets for each row
execute function public.util__set_updated_at ();

/**
 * Refuses any change to the dataset, Google account, document or tab a Sheets
 * satellite row names, whoever makes it. Everyone who can see the dataset
 * reads that tab with that account's Google grant, so editing the dataset
 * must never be a way to read a different sheet, or to read with a different
 * person's grant.
 */
create or replace function public.datasets__google_sheets__prevent_source_change () returns trigger language plpgsql
set
  search_path = public as $$
begin
  if
    new.dataset_id is distinct from old.dataset_id or
    new.google_account_id is distinct from old.google_account_id or
    new.google_document_id is distinct from old.google_document_id or
    new.sheet_name is distinct from old.sheet_name
  then
    raise exception 'a Google Sheets dataset cannot be repointed at another sheet'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

-- Trigger-only. The trigger machinery does not consult EXECUTE, so no
-- Data API role needs a grant for the trigger to fire.
revoke
execute on function public.datasets__google_sheets__prevent_source_change ()
from
  public,
  anon,
  authenticated,
  service_role;

create trigger tr__datasets__google_sheets__prevent_source_change before
update of dataset_id,
google_account_id,
google_document_id,
sheet_name on public.datasets__google_sheets for each row
execute function public.datasets__google_sheets__prevent_source_change ();
