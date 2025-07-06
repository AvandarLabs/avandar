drop policy "User/not all can see entity_field_configs" on "public"."entity_field_configs";

drop policy "User can DELETE entity_configs" on "public"."entity_configs";

drop policy "User can INSERT entity_configs" on "public"."entity_configs";

drop policy "User can SELECT entity_configs" on "public"."entity_configs";

drop policy "User can UPDATE entity_configs" on "public"."entity_configs";

drop policy "User can DELETE entity_field_configs" on "public"."entity_field_configs";

drop policy "User can INSERT entity_field_configs" on "public"."entity_field_configs";

drop policy "User can UPDATE entity_field_configs" on "public"."entity_field_configs";

drop policy "User can DELETE value_extractors__aggregation" on "public"."value_extractors__aggregation";

drop policy "User can INSERT value_extractors__aggregation" on "public"."value_extractors__aggregation";

drop policy "User can SELECT value_extractors__aggregation" on "public"."value_extractors__aggregation";

drop policy "User can UPDATE value_extractors__aggregation" on "public"."value_extractors__aggregation";

drop policy "User can DELETE value_extractors__dataset_column_value" on "public"."value_extractors__dataset_column_value";

drop policy "User can INSERT value_extractors__dataset_column_value" on "public"."value_extractors__dataset_column_value";

drop policy "User can SELECT value_extractors__dataset_column_value" on "public"."value_extractors__dataset_column_value";

drop policy "User can UPDATE value_extractors__dataset_column_value" on "public"."value_extractors__dataset_column_value";

drop policy "User can DELETE value_extractors__manual_entry" on "public"."value_extractors__manual_entry";

drop policy "User can INSERT value_extractors__manual_entry" on "public"."value_extractors__manual_entry";

drop policy "User can SELECT value_extractors__manual_entry" on "public"."value_extractors__manual_entry";

drop policy "User can UPDATE value_extractors__manual_entry" on "public"."value_extractors__manual_entry";

create policy "User can SELECT entity_field_configs"
on "public"."entity_field_configs"
as permissive
for select
to authenticated
using (util__auth_user_is_workspace_member(workspace_id));


create policy "User can DELETE entity_configs"
on "public"."entity_configs"
as permissive
for delete
to authenticated
using (util__auth_user_is_workspace_member(workspace_id));


create policy "User can INSERT entity_configs"
on "public"."entity_configs"
as permissive
for insert
to authenticated
with check (util__auth_user_is_workspace_member(workspace_id));


create policy "User can SELECT entity_configs"
on "public"."entity_configs"
as permissive
for select
to authenticated
using (util__auth_user_is_workspace_member(workspace_id));


create policy "User can UPDATE entity_configs"
on "public"."entity_configs"
as permissive
for update
to authenticated
with check (util__auth_user_is_workspace_member(workspace_id));


create policy "User can DELETE entity_field_configs"
on "public"."entity_field_configs"
as permissive
for delete
to authenticated
using (util__auth_user_is_workspace_member(workspace_id));


create policy "User can INSERT entity_field_configs"
on "public"."entity_field_configs"
as permissive
for insert
to authenticated
with check (util__auth_user_is_workspace_member(workspace_id));


create policy "User can UPDATE entity_field_configs"
on "public"."entity_field_configs"
as permissive
for update
to authenticated
with check (util__auth_user_is_workspace_member(workspace_id));


create policy "User can DELETE value_extractors__aggregation"
on "public"."value_extractors__aggregation"
as permissive
for delete
to authenticated
using (util__auth_user_is_workspace_member(workspace_id));


create policy "User can INSERT value_extractors__aggregation"
on "public"."value_extractors__aggregation"
as permissive
for insert
to authenticated
with check (util__auth_user_is_workspace_member(workspace_id));


create policy "User can SELECT value_extractors__aggregation"
on "public"."value_extractors__aggregation"
as permissive
for select
to authenticated
using (util__auth_user_is_workspace_member(workspace_id));


create policy "User can UPDATE value_extractors__aggregation"
on "public"."value_extractors__aggregation"
as permissive
for update
to authenticated
with check (util__auth_user_is_workspace_member(workspace_id));


create policy "User can DELETE value_extractors__dataset_column_value"
on "public"."value_extractors__dataset_column_value"
as permissive
for delete
to authenticated
using (util__auth_user_is_workspace_member(workspace_id));


create policy "User can INSERT value_extractors__dataset_column_value"
on "public"."value_extractors__dataset_column_value"
as permissive
for insert
to authenticated
with check (util__auth_user_is_workspace_member(workspace_id));


create policy "User can SELECT value_extractors__dataset_column_value"
on "public"."value_extractors__dataset_column_value"
as permissive
for select
to authenticated
using (util__auth_user_is_workspace_member(workspace_id));


create policy "User can UPDATE value_extractors__dataset_column_value"
on "public"."value_extractors__dataset_column_value"
as permissive
for update
to authenticated
with check (util__auth_user_is_workspace_member(workspace_id));


create policy "User can DELETE value_extractors__manual_entry"
on "public"."value_extractors__manual_entry"
as permissive
for delete
to authenticated
using (util__auth_user_is_workspace_member(workspace_id));


create policy "User can INSERT value_extractors__manual_entry"
on "public"."value_extractors__manual_entry"
as permissive
for insert
to authenticated
with check (util__auth_user_is_workspace_member(workspace_id));


create policy "User can SELECT value_extractors__manual_entry"
on "public"."value_extractors__manual_entry"
as permissive
for select
to authenticated
using (util__auth_user_is_workspace_member(workspace_id));


create policy "User can UPDATE value_extractors__manual_entry"
on "public"."value_extractors__manual_entry"
as permissive
for update
to authenticated
with check (util__auth_user_is_workspace_member(workspace_id));



