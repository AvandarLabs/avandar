import type { SupabaseRestClient } from "../../SupabaseRest";

import { mock } from "bun:test";

/**
 * A `SupabaseRestClient` that answers from a fixed table-to-rows map, plus the
 * list of tables it was actually asked for. A table missing from the map
 * answers with no rows, which is how the suite says "live, but empty".
 */
export function makeRest(
  responsesByTable: Record<string, ReadonlyArray<Record<string, unknown>>>,
): { rest: SupabaseRestClient; calls: string[] } {
  const calls: string[] = [];
  const rest: SupabaseRestClient = {
    selectAll: mock(async (table: string) => {
      calls.push(table);
      return responsesByTable[table] ?? [];
    }),
  };
  return { rest, calls };
}
