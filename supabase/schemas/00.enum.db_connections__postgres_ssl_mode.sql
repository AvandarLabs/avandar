/**
 * How a Postgres connection negotiates TLS. v1 offers only these two; see
 * the design spec's future-work section for additional modes.
 */
create type public.db_connections__postgres_ssl_mode as enum('disable', 'require');
