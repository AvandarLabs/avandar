alter table "public"."resource_shares" add column "requires_app_access" boolean not null default false;

alter table "public"."resource_shares" add constraint "resource_shares__requires_app_access_only_for_groups" CHECK (((requires_app_access = false) OR (principal_type = 'user_group'::public.share_principal_type))) not valid;

alter table "public"."resource_shares" validate constraint "resource_shares__requires_app_access_only_for_groups";


