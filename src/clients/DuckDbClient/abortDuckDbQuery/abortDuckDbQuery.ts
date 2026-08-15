type CancellableDuckDbConnection = {
  cancelSent: () => unknown;
};

/** Registers one AbortSignal to cancel the active DuckDB query. */
export function abortDuckDbQuery(
  signal: AbortSignal,
  connection: CancellableDuckDbConnection,
): () => void {
  signal.throwIfAborted();
  const onAbort = (): void => {
    void connection.cancelSent();
  };
  signal.addEventListener("abort", onAbort, { once: true });
  return () => {
    signal.removeEventListener("abort", onAbort);
  };
}
