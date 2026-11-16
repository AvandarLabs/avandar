import { printError, printWarn } from "@ava-cli/utils/cliOutput/cliOutput";
import { Acclimate } from "@avandar/acclimate";

/**
 * Runs the body of an `ava plugin` subcommand with the behavior every one of
 * them shares. A help request prints the help text and does nothing else.
 * A failure prints the error and an indented recovery line, then sets a
 * nonzero exit code, so a script sees the failure and a person never sees a
 * stack trace.
 */
export async function runPluginCommandAction(options: {
  commandName: string;
  helpText: string;
  isHelpRequested: boolean;
  run: () => void | Promise<void>;
}): Promise<void> {
  const { commandName, helpText, isHelpRequested, run } = options;
  if (isHelpRequested) {
    Acclimate.log(helpText);
    return;
  }
  try {
    await run();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    printError(`❌ ${commandName}: ${message}`);
    printWarn(
      `  ⚠️ Fix the problem above, then run ${commandName} again. ` +
        `Run ${commandName} --help for usage.`,
    );
    process.exitCode = 1;
  }
}
