drop policy "User can INSERT workspaces" on "public"."workspaces";

alter table "public"."workspaces" add column "owner_id" uuid not null default auth.uid();

alter table "public"."workspaces" add constraint "workspaces_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON UPDATE CASCADE not valid;

alter table "public"."workspaces" validate constraint "workspaces_owner_id_fkey";

create policy "User can INSERT workspaces"
on "public"."workspaces"
as permissive
for insert
to authenticated
with check ((auth.uid() = owner_id));



