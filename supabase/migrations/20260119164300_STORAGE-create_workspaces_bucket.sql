-- Create bucket if not exists
insert into
  storage.buckets (
    id,
    name,
    public
  )
values
  (
    'workspaces',
    'workspaces',
    false
  )
on conflict (id) do nothing;
