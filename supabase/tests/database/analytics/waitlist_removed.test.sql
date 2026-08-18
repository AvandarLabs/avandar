-- Proves the retired platform waitlist cannot reappear through schema drift or
-- an analytics registry edit.

begin;

select plan(3);

select hasnt_table(
  'public',
  'waitlist_signups',
  'the retired waitlist_signups table is absent'
);

select is(
  public.util__analytics_event_category('waitlist.code_verified')::text,
  'other',
  'waitlist.code_verified is no longer a registered analytics event'
);

select is(
  public.util__analytics_event_category('waitlist.code_claimed')::text,
  'other',
  'waitlist.code_claimed is no longer a registered analytics event'
);

select * from finish();

rollback;
