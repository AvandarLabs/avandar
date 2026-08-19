type OfflineSqlExecuteResult = { ok: true } | { ok: false; error: string };

type OfflineSqlExecutor = (sql: string) => Promise<OfflineSqlExecuteResult>;

/**
 * Wraps an offline SQL executor so a stale chat generation never runs DuckDB.
 * Returns `{ ok: true }` without calling the executor, so the offline pipeline
 * does not enter its repair/fix path after New chat.
 */
export function createGenerationAwareExecuteSql(
  executeSql: OfflineSqlExecutor,
  isGenerationStale: () => boolean,
): OfflineSqlExecutor {
  return async (sql) => {
    if (isGenerationStale()) {
      return { ok: true };
    }
    return executeSql(sql);
  };
}
