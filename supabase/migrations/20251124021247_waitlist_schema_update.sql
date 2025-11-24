
  create policy "
  Anyone can INSERT to the waitlist
"
  on "public"."waitlist_signups"
  as permissive
  for insert
  to authenticated, anon
with check (true);



