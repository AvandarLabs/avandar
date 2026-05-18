import { defineIpcContract } from "$/platform/ipc/contracts/defineIpcContract.ts";

/**
 * RDB (SQLite via `bun:sqlite` in Bun main) IPC contracts. The webview
 * issues these calls through `callIpc` from `createSqliteCrudClient`; Bun
 * main registers handlers via `IpcServer.handle` in
 * `apps/desktop/main/ipc/rdb.ts` (Phase 2 Task 8).
 */
export const RdbContracts = {
  run: defineIpcContract<
    { sql: string; params: unknown[] },
    { changes: number; lastInsertRowid: number }
  >("rdb.run"),
  query: defineIpcContract<
    { sql: string; params: unknown[] },
    { rows: Array<Record<string, unknown>> }
  >("rdb.query"),
  transaction: defineIpcContract<
    {
      statements: Array<{
        sql: string;
        params: unknown[];
      }>;
    },
    { results: Array<{ changes: number }> }
  >("rdb.transaction"),
} as const;
