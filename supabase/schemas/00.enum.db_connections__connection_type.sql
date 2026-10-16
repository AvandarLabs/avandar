/**
 * The kind of external data source a saved `db_connections` row connects to.
 * One value per connector type, mirroring `datasets__source_type`'s role for
 * datasets.
 */
create type public.db_connections__connection_type as enum('postgres');
