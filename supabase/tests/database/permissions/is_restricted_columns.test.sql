\set ON_ERROR_STOP on

begin;

set search_path to extensions, public;

select plan(2);

select has_column('dashboards'::name, 'is_restricted'::name);

select has_column('datasets'::name, 'is_restricted'::name);

select * from finish();

rollback;
