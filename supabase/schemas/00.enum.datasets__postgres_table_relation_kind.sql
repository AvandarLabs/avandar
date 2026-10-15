/** Whether a `datasets__postgres_table` row backs a table or a view. */
create type public.datasets__postgres_table_relation_kind as enum('table', 'view');
