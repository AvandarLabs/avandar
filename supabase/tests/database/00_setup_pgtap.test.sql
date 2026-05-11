set
  search_path to extensions,
  public;

select
  plan (1);

create extension if not exists pgtap
with
  schema extensions;

select
  ok (
    (
      select
        count(*) = 1
      from
        pg_extension
      where
        extname = 'pgtap'
    ),
    'pgtap extension is installed'
  );

select
  *
from
  finish ();
