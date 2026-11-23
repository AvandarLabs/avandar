import { isIP } from "node:net";
import type { PostgresDatabaseConnection } from "$/models/connections/PostgresDatabaseConnection/PostgresDatabaseConnection.ts";

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
  /**
   * The address the SSRF check vetted, never the hostname the user entered:
   * the driver would resolve a hostname again when it connects, and could
   * get a different, unsafe address than the one checked.
   */
  host: string;
  /**
   * The hostname the user entered, sent as the TLS server name so a server
   * that routes or presents certificates by name still sees it. `undefined`
   * when the user entered an IP address.
   */
  tlsServerName: string | undefined;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl: false | "require";
};

/**
 * Minimal row shape from `connections__postgres` plus the decrypted
 * secret and the address the SSRF check vetted for `host`.
 */
export type DecryptedPostgresConnection = {
  host: string;
  vettedAddress: string;
  port: number;
  databaseName: string;
  username: string;
  sslMode: PostgresDatabaseConnection.SslMode;
  password: string;
};

/** Converts a decrypted connection row into the driver's own config shape. */
export function makePostgresConnectionConfigFromDecryptedConnection(
  connection: DecryptedPostgresConnection,
): PostgresConnectionConfig {
  return {
    host: connection.vettedAddress,
    tlsServerName: isIP(connection.host) === 0 ? connection.host : undefined,
    port: connection.port,
    database: connection.databaseName,
    username: connection.username,
    password: connection.password,
    ssl: connection.sslMode === "require" ? "require" : false,
  };
}
