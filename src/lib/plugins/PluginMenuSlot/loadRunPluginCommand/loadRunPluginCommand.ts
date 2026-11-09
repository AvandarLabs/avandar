import type { runPluginCommand } from "@/lib/plugins/runPluginCommand/runPluginCommand";

type RunPluginCommand = typeof runPluginCommand;

function _importRunPluginCommand(): Promise<RunPluginCommand> {
  return import("@/lib/plugins/runPluginCommand/runPluginCommand").then(
    (runnerModule) => {
      return runnerModule.runPluginCommand;
    },
  );
}

let runPluginCommandPromise: Promise<RunPluginCommand> | undefined;

/**
 * Loads `runPluginCommand` on first use and reuses it afterwards. The runner
 * reaches the plugin SDK runtime and Lingui's message compiler, so it loads
 * when a user picks a command rather than with the app. A failed import is
 * forgotten, so the next call retries it.
 *
 * Keep the specifier in `import()` a literal path, so the bundler can split
 * the runner into its own chunk.
 */
export function loadRunPluginCommand(): Promise<RunPluginCommand> {
  runPluginCommandPromise ??= _importRunPluginCommand().catch(
    (error: unknown) => {
      runPluginCommandPromise = undefined;
      throw error;
    },
  );
  return runPluginCommandPromise;
}
