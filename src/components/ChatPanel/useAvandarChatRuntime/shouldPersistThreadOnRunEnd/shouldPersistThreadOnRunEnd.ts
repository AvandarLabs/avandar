/** Inputs for deciding whether an idle edge should persist the chat thread. */
export type ShouldPersistThreadOnRunEndOptions = {
  wasRunning: boolean;
  isRunning: boolean;
  runStartGeneration: number;
  currentGeneration: number;
};

/**
 * Returns whether the chat thread should be written when a run goes idle.
 * Skips writes after New chat bumps generation mid-run so a late idle edge
 * cannot recreate a cleared blob.
 */
export function shouldPersistThreadOnRunEnd(
  options: Readonly<ShouldPersistThreadOnRunEndOptions>,
): boolean {
  return (
    options.wasRunning &&
    !options.isRunning &&
    options.runStartGeneration === options.currentGeneration
  );
}
