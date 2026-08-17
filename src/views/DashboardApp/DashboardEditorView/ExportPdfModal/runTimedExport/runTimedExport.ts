/**
 * Times a successful export. A rejected export reports nothing: the caller's
 * own catch block handles the failure, and a failed export has no meaningful
 * duration to record.
 */
export async function runTimedExport(
  options: Readonly<{
    runExport: () => Promise<void>;
    onExported: (durationMs: number) => void;
  }>,
): Promise<void> {
  const startedAt = performance.now();
  await options.runExport();
  options.onExported(performance.now() - startedAt);
}
