drop policy "User can DELETE entity_field_configs" on "public"."entity_field_configs";

drop policy "User can INSERT entity_field_configs" on "public"."entity_field_configs";

drop policy "User can UPDATE entity_field_configs" on "public"."entity_field_configs";

drop policy "User can see entity_field_configs" on "public"."entity_field_configs";

create policy "User can DELETE entity_field_configs"
on "public"."entity_field_configs"
as permissive
for delete
to authenticated
using (true);


create policy "User can INSERT entity_field_configs"
on "public"."entity_field_configs"
as permissive
for insert
to authenticated
with check (true);


create policy "User can UPDATE entity_field_configs"
on "public"."entity_field_configs"
as permissive
for update
to authenticated
with check (true);


create policy "User can see entity_field_configs"
on "public"."entity_field_configs"
as permissive
for select
to authenticated
using (true);



