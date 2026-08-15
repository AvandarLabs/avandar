create schema if not exists private;

revoke all on schema private
from
  public,
  anon,
  authenticated,
  service_role;

grant usage on schema private to authenticated;
