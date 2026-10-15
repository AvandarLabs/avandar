/**
 * A Postgres connection's parameters as a structured object - never a
 * connection-string/URL built by interpolating these fields into one piece
 * of text. Passing them to the driver this way means there is no string for
 * a crafted `host`/`username`/`password`/`databaseName` to break out of;
 * each field is just a property on a plain object the driver reads
 * directly, the same reason a parameterized SQL query is safe against a
 * crafted *value* - there is no text for the value to be concatenated into.
 */
export type PostgresConnectionConfig = {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl: false | "require";
};

/**
 * Minimal row shape from `db_connections__postgres` plus the decrypted
 * secret.
 */
export type DecryptedPostgresConnection = {
  host: string;
  port: number;
  databaseName: string;
  username: string;
  sslMode: "disable" | "require";
  password: string;
};

export function toPostgresConnectionConfig(
  connection: DecryptedPostgresConnection,
): PostgresConnectionConfig {
  return {
    host: connection.host,
    port: connection.port,
    database: connection.databaseName,
    username: connection.username,
    password: connection.password,
    ssl: connection.sslMode === "require" ? "require" : false,
  };
}
