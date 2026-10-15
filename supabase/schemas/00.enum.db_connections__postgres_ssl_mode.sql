/**
 * How a Postgres connection negotiates TLS. Only these two modes are
 * supported today; a future revision can add more without a breaking change
 * since callers already branch on this enum exhaustively.
 */
create type public.db_connections__postgres_ssl_mode as enum('disable', 'require');
