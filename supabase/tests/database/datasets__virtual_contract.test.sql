\set ON_ERROR_STOP on

begin;

select plan(2);

select hasnt_column(
  'public',
  'datasets__virtual',
  'plan_steps',
  'datasets__virtual has no retired workflow payload'
);

select has_function(
  'public',
  'rpc_datasets__add_virtual_dataset',
  array[
    'uuid',
    'uuid',
    'text',
    'text',
    'dataset_column_input[]',
    'text'
  ]::name[],
  'virtual dataset RPC keeps the six-argument contract'
);

select * from finish();

rollback;
