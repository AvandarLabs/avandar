create table public.datasets__csv_file (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Dataset this metadata belongs to
  dataset_id uuid not null unique references public.datasets (id) on update cascade on delete cascade,
  -- Workspace this dataset belongs to
  workspace_id uuid not null references public.workspaces (id) on update cascade on delete cascade,
  -- Timestamp of when the dataset was created.
  created_at timestamptz not null default now(),
  -- Timestamp of when the dataset was last updated.
  updated_at timestamptz not null default now(),
  -- Size of the CSV in bytes
  size_in_bytes integer not null,
  -- Number of rows to skip at the start of the file
  rows_to_skip integer not null default 0,
  -- Quote character used in the CSV file
  quote_char text,
  -- Escape character used in the CSV file
  escape_char text,
  -- Delimiter used in the CSV file
  delimiter text not null,
  -- Newline delimiter used in the CSV file
  newline_delimiter text not null default E'\n',
  -- Comment character used in the CSV file. Nullable.
  comment_char text,
  -- Whether the CSV has a header
  has_header boolean not null default true,
  -- Date format of the CSV file. Nullable.
  date_format text,
  -- Timestamp format of the CSV file. Nullable.
  timestamp_format text
);

-- Enable row level security
alter table public.datasets__csv_file enable row level security;

-- Policies
create policy "
  User can SELECT datasets__csv_file in their workspace
" on public.datasets__csv_file for
select
  to authenticated using (
    public.datasets__csv_file.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  );

create policy "
  User can INSERT datasets__csv_file in their workspace
" on public.datasets__csv_file for insert to authenticated
with
  check (
    public.datasets__csv_file.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  );

create policy "
  User can UPDATE datasets__csv_file in their workspace
" on public.datasets__csv_file
for update
  to authenticated using (
    public.datasets__csv_file.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  )
with
  check (
    -- Updated values must still be in the auth user's workspace
    public.datasets__csv_file.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  );

create policy "
  User can DELETE datasets__csv_file in their workspace
" on public.datasets__csv_file for delete to authenticated using (
  public.datasets__csv_file.workspace_id = any (
    array(
      select
        public.util__get_auth_user_workspaces ()
    )
  )
);

/**
 * Trigger the `updated_at` update
 */
create trigger tr_datasets__csv_file__set_updated_at before
update on public.datasets__csv_file for each row
execute function public.util__set_updated_at ();
