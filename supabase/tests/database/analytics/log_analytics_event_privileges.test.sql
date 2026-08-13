begin;

select plan(1);

set local role authenticated;

select throws_ok(
  $$ select public.util__log_analytics_event('user.registered') $$,
  '42501',
  null,
  'authenticated cannot execute the SECURITY DEFINER helper, so events cannot be forged through PostgREST'
);

reset role;

select * from finish();

rollback;
