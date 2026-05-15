alter table "public"."workspace_invites"
add column "invite_user_group_ids" uuid[] not null default '{}'::uuid[];

alter table "public"."workspace_invites"
add column "role_group_id" uuid;

alter table "public"."workspace_invites"
add column "role_overrides" jsonb not null default '[]'::jsonb;

create index idx_workspace_invites__role_group_id on public.workspace_invites using btree (
  role_group_id
);

alter table "public"."workspace_invites"
add constraint "workspace_invites_role_group_id_fkey" foreign key (
  role_group_id
) references public.role_groups (id) on update cascade on delete set null not valid;

alter table "public"."workspace_invites" validate constraint "workspace_invites_role_group_id_fkey";

update public.workspace_invites wi
set
  role_group_id = rg.id
from
  public.role_groups rg
where
  rg.workspace_id = wi.workspace_id and
  rg.is_builtin = true and
  rg.name = case wi.role
    when 'admin' then 'Global Admin'
    else 'Global Viewer'
  end and
  wi.role_group_id is null;

create policy "
  Settings admins can DELETE any workspace invite
" on "public"."workspace_invites" as permissive for delete to authenticated using (
  (
    exists (
      select
        1
      from
        (
          public.workspace_memberships wm
          join public.role_group_app_roles rgar on (
            (
              rgar.role_group_id = wm.role_group_id
            )
          )
        )
      where
        (
          (
            wm.workspace_id = workspace_invites.workspace_id
          ) and
          (
            wm.user_id = auth.uid ()
          ) and
          (
            rgar.app = 'settings'::public.app_type
          ) and
          (
            rgar.role = 'admin'::public.role_level
          )
        )
    )
  )
);

create policy "
  Settings admins can SELECT workspace invites
" on "public"."workspace_invites" as permissive for
select
  to authenticated using (
    (
      exists (
        select
          1
        from
          (
            public.workspace_memberships wm
            join public.role_group_app_roles rgar on (
              (
                rgar.role_group_id = wm.role_group_id
              )
            )
          )
        where
          (
            (
              wm.workspace_id = workspace_invites.workspace_id
            ) and
            (
              wm.user_id = auth.uid ()
            ) and
            (
              rgar.app = 'settings'::public.app_type
            ) and
            (
              rgar.role = 'admin'::public.role_level
            )
          )
      )
    )
  );

create policy "
  Settings admins can UPDATE any workspace invite
" on "public"."workspace_invites" as permissive
for update
  to authenticated using (
    (
      exists (
        select
          1
        from
          (
            public.workspace_memberships wm
            join public.role_group_app_roles rgar on (
              (
                rgar.role_group_id = wm.role_group_id
              )
            )
          )
        where
          (
            (
              wm.workspace_id = workspace_invites.workspace_id
            ) and
            (
              wm.user_id = auth.uid ()
            ) and
            (
              rgar.app = 'settings'::public.app_type
            ) and
            (
              rgar.role = 'admin'::public.role_level
            )
          )
      )
    )
  )
with
  check (
    (
      exists (
        select
          1
        from
          (
            public.workspace_memberships wm
            join public.role_group_app_roles rgar on (
              (
                rgar.role_group_id = wm.role_group_id
              )
            )
          )
        where
          (
            (
              wm.workspace_id = workspace_invites.workspace_id
            ) and
            (
              wm.user_id = auth.uid ()
            ) and
            (
              rgar.app = 'settings'::public.app_type
            ) and
            (
              rgar.role = 'admin'::public.role_level
            )
          )
      )
    )
  );
