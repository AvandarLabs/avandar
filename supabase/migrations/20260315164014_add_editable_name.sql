drop policy "
  User can INSERT dataset_columns in their workspace
" on "public"."dataset_columns";

drop policy "
  User can SELECT dataset_columns in their workspace
" on "public"."dataset_columns";

drop policy "
  User can UPDATE dataset_columns in their workspace
" on "public"."dataset_columns";

drop policy "User can DELETE dataset_columns in their workspace" on "public"."dataset_columns";

-- 1. Add the "original_name" column allowing nulls
alter table "public"."dataset_columns"
add column "original_name" text;

-- 2. Copy all values from "name" to "original_name"
update "public"."dataset_columns"
set
  "original_name" = "name";

-- 3. Make "original_name" NOT NULL
alter table "public"."dataset_columns"
alter column "original_name"
set not null;

create policy "User can delete dataset_columns in their workspace" on "public"."dataset_columns" as permissive for delete to authenticated using (
  (
    workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces () as util__get_auth_user_workspaces
      )
    )
  )
);

create policy "User can insert dataset_columns in their workspace" on "public"."dataset_columns" as permissive for insert to authenticated
with
  check (
    (
      workspace_id = any (
        array(
          select
            public.util__get_auth_user_workspaces () as util__get_auth_user_workspaces
        )
      )
    )
  );

create policy "User can select dataset_columns in their workspace" on "public"."dataset_columns" as permissive for
select
  to authenticated using (
    (
      workspace_id = any (
        array(
          select
            public.util__get_auth_user_workspaces () as util__get_auth_user_workspaces
        )
      )
    )
  );

create policy "User can update dataset_columns in their workspace" on "public"."dataset_columns" as permissive
for update
  to authenticated using (
    (
      workspace_id = any (
        array(
          select
            public.util__get_auth_user_workspaces () as util__get_auth_user_workspaces
        )
      )
    )
  )
with
  check (
    (
      workspace_id = any (
        array(
          select
            public.util__get_auth_user_workspaces () as util__get_auth_user_workspaces
        )
      )
    )
  );
