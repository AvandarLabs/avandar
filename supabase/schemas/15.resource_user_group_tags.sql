-- Labels a resource (dashboard or dataset) with workspace user_groups (tags).
-- With memberships, enforces tag intersection: app role applies only if the
-- member shares at least one tag when this resource has tag rows.
-- If is_restricted is true, skip tag-based grants (use shares or owner paths).
-- Each row represents an edge linking a resource to a user_group.
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
