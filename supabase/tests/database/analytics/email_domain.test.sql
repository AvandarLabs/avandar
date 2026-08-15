-- `util__email_domain` is the only thing the acquisition events take from an
-- email address. The address itself never lands in a payload, so the exact
-- normalisation this function applies is the whole privacy contract.

begin;

select plan(7);

select is(
  public.util__email_domain('Person@Example.COM'),
  'example.com',
  'the domain is lower-cased so example.com and EXAMPLE.COM group together'
);

select is(
  public.util__email_domain('  person@example.com  '),
  'example.com',
  'surrounding whitespace is trimmed before the domain is read'
);

select is(
  public.util__email_domain(null),
  null,
  'a null address yields null rather than raising, because auth.users.email is nullable'
);

select is(
  public.util__email_domain('not-an-email'),
  null,
  'an address with no @ yields null rather than an empty string'
);

select is(
  public.util__email_domain('a@b@c.com'),
  null,
  'an address with more than one @ is rejected'
);

select is(
  public.util__email_domain('@example.com'),
  null,
  'an address with an empty local part is rejected'
);

select is(
  public.util__email_domain('person@'),
  null,
  'an address with an empty domain is rejected'
);

select * from finish();

rollback;
