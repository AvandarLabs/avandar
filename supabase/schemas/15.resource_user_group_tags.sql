-- Labels a resource (dashboard or dataset) with workspace user_groups (tags).
-- With memberships, enforces tag intersection: app role applies only if the
-- member shares at least one tag when this resource has tag rows.
-- If is_restricted is true, skip tag-based grants (use shares or owner paths).
create table public.resource_user_group_tags (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on update cascade on delete cascade,
  resource_type public.resource_type not null,
  resource_id uuid not null,
  user_group_id uuid not null references public.user_groups (id) on update cascade on delete cascade,
  created_at timestamptz not null default now(),
  constraint resource_user_group_tags__resource_tag unique (
    workspace_id,
    resource_type,
    resource_id,
    user_group_id
  )
);

create index idx_resource_user_group_tags__resource on public.resource_user_group_tags (
  resource_type,
  resource_id
);

-- Enable row level security
alter table public.resource_user_group_tags enable row level security;

create policy "Members can select resource_user_group_tags" on public.resource_user_group_tags for
select
  to authenticated using (
    public.resource_user_group_tags.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  );

create policy "Settings admins can insert resource_user_group_tags" on public.resource_user_group_tags for insert to authenticated
with
  check (
    public.util__is_settings_admin (
      public.resource_user_group_tags.workspace_id
    )
  );

create policy "Settings admins can update resource_user_group_tags" on public.resource_user_group_tags
for update
  to authenticated using (
    public.util__is_settings_admin (
      public.resource_user_group_tags.workspace_id
    )
  )
with
  check (
    public.util__is_settings_admin (
      public.resource_user_group_tags.workspace_id
    )
  );

create policy "Settings admins can delete resource_user_group_tags" on public.resource_user_group_tags for delete to authenticated using (
  public.util__is_settings_admin (
    public.resource_user_group_tags.workspace_id
  )
);
