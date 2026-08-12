import type { Brand } from "@avandar/utils";

/**
 * Platform-agnostic relational database client.
 *
 * On web this wraps the Supabase JS client. On desktop (Phase 2+) this is an
 * IPC client that talks to bun:sqlite in the Bun main process.
 */
export interface RdbClient {
  query<TRow>(model: ModelName, filter: RdbFilter): Promise<readonly TRow[]>;
  upsert<TRow>(model: ModelName, row: TRow): Promise<TRow>;
  delete(model: ModelName, id: string): Promise<void>;
  transaction<TResult>(fn: (tx: RdbTx) => Promise<TResult>): Promise<TResult>;
}

/**
 * Transaction handle. Same surface as {@link RdbClient} minus the nested
 * `transaction` call (transactions don't nest).
 */
export interface RdbTx {
  query<TRow>(model: ModelName, filter: Readonly<RdbFilter>): Promise<TRow[]>;
  upsert<TRow>(model: ModelName, row: TRow): Promise<TRow>;
  delete(model: ModelName, id: string): Promise<void>;
}

/**
 * Branded model identifier. Use {@link asModelName} to construct.
 */
export type ModelName = Brand<string, "ModelName">;

/**
 * Common filter shape supported by every backend (Supabase, SQLite).
 *
 * Backends may support additional clauses; consumers must rely only on the
 * keys declared here for portability.
 */
export type RdbFilter = {
  eq?: Record<string, unknown>;
  in?: Record<string, readonly unknown[]>;
  orderBy?: Array<{
    column: string;
    direction: "asc" | "desc";
  }>;
  limit?: number;
  offset?: number;
};

/**
 * Cast a plain string into a branded {@link ModelName}. The brand is purely
 * structural — runtime value is unchanged.
 *
 * @param name - Raw model identifier (e.g. `"workspaces"`).
 * @returns The same string typed as a {@link ModelName}.
 */
export function asModelName(name: string): ModelName {
  return name as ModelName;
}
