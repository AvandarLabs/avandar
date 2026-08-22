import { callIpc } from "$/platform/ipc/client.ts";
import { RdbContracts } from "$/platform/ipc/contracts/RdbContracts.ts";
import type { SqliteTransport } from "@avandar/clients";

/**
 * Avandar's SQLite transport: the typed Electrobun IPC bridge to the Bun main
 * process, which holds the only `bun:sqlite` handle.
 *
 * `createSqliteCrudClient` takes a {@link SqliteTransport} so that
 * `@avandar/clients` carries no dependency on this app's IPC layer. This is the
 * Avandar-specific implementation of that interface. It lives in `shared/`
 * because it is business logic, not a reusable primitive.
 */
export const ipcSqliteTransport: SqliteTransport = {
  query: (request) => {
    return callIpc(RdbContracts.query, request);
  },
  run: (request) => {
    return callIpc(RdbContracts.run, request);
  },
};
