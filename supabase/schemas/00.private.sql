/**
 * The internal schema. Nothing here is API surface: it holds the
 * `security definer` helpers that RLS policies and triggers call, which read
 * past RLS (billing rows, other people's dashboards, whole-workspace
 * inventories) and would be probes if an ordinary user could invoke them.
 *
 * `private` is deliberately absent from `config.toml`'s `[api] schemas` list,
 * so PostgREST does not serve it at all. `90.analytics_schema.sql` relies on
 * the same guarantee.
 *
 * The single `grant usage` below is the whole schema ACL. It only lets
 * `authenticated` RESOLVE a name here: EXECUTE is a separate per-function
 * privilege, and every function defined here revokes it explicitly.
 * `authenticated` needs it because two of these helpers are called from
 * storage RLS policies (`99.storage.sql`) that are evaluated as the calling
 * role rather than as the policy's owner. Those two, and only those two, are
 * granted EXECUTE individually in `16.utils.resource-permissions.sql`.
 * Everything else is reached only through the trigger machinery, which does
 * not consult EXECUTE at all.
 *
 * `service_role` is intentionally NOT granted usage. It bypasses RLS, so it
 * never needs to resolve these helpers, and leaving it out keeps the schema
 * unreachable from the one key that could otherwise call anything.
 */
create schema if not exists private;

grant usage on schema private to authenticated;
