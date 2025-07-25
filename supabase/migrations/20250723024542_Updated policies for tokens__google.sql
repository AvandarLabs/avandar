drop policy "User can SELECT their own tokens__google" on "public"."tokens__google";

create policy "User can DELETE their own google tokens"
on "public"."tokens__google"
as permissive
for delete
to authenticated
using ((user_id = auth.uid()));


create policy "User can INSERT their own google tokens"
on "public"."tokens__google"
as permissive
for insert
to authenticated
with check ((user_id = auth.uid()));


create policy "User can SELECT their own google tokens"
on "public"."tokens__google"
as permissive
for select
to authenticated
using ((user_id = auth.uid()));


create policy "User can UPDATE their own google tokens"
on "public"."tokens__google"
as permissive
for update
to authenticated
using ((user_id = auth.uid()));



