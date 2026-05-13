-- This is a valid Avandar data type
create type public.datasets__ava_data_type as enum(
  'boolean',
  'bigint',
  'double',
  'time',
  'date',
  'timestamp',
  'varchar'
);

create type public.datasets__duckdb_data_type as enum(
  'BOOLEAN',
  'TINYINT',
  'SMALLINT',
  'INTEGER',
  'BIGINT',
  'UBIGINT',
  'UTINYINT',
  'USMALLINT',
  'UINTEGER',
  'FLOAT',
  'DOUBLE',
  'DECIMAL',
  'DATE',
  'TIME',
  'TIMESTAMP',
  'TIMESTAMP_TZ',
  'TIMESTAMP WITH TIME ZONE',
  'INTERVAL',
  'VARCHAR',
  'BLOB',
  'UUID',
  'HUGEINT',
  'BIT',
  'ENUM',
  'MAP',
  'STRUCT',
  'LIST',
  'UNION',
  'JSON',
  'GEOMETRY'
);
