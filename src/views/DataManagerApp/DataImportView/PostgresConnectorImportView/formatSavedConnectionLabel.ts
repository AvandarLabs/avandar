import type { PostgresDatabaseConnectionWithDetails } from "@/clients/connections/DatabaseConnectionClient";

/** `"<name> - <host>:<port>/<database>"`. */
export function formatSavedConnectionLabel(
  details: PostgresDatabaseConnectionWithDetails,
): string {
  const { connection, postgres } = details;
  return `${connection.name} - ${postgres.host}:${postgres.port}/${postgres.databaseName}`;
}
