\set ON_ERROR_STOP on

begin;

drop table public.dashboards cascade;
drop type public.dashboard_visibility cascade;

create table public.dashboards (
  id uuid primary key,
  workspace_id uuid not null,
  is_public boolean not null default false,
  slug text
);

alter table public.dashboards enable row level security;

create policy "Anon can read public dashboards" on public.dashboards for
select
  to anon using (
    public.dashboards.is_public = true
  );

create unique index dashboards__slug_unique_when_public on public.dashboards (slug)
where
  is_public = true and
  slug is not null;

insert into public.dashboards (id, workspace_id, is_public, slug)
values
  (
    'f6004001-0000-4000-8000-000000000001'::uuid,
    'f6001001-0000-4000-8000-000000000001'::uuid,
    true,
    'f6-public'
  ),
  (
    'f6004002-0000-4000-8000-000000000002'::uuid,
    'f6001001-0000-4000-8000-000000000001'::uuid,
    false,
    'f6-draft'
  );
