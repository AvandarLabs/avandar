import { normalizeCommandArguments } from "./normalizeCommandArguments.mjs";
import { parseCommandArguments } from "./parseCommandArguments.mjs";
import { runCommandWizard } from "./runCommandWizard.mjs";
import { TerminalSession } from "./TerminalSession.mjs";

/**
 * Returns validated worker arguments, prompting for applicable missing values.
 */
export async function prepareCommandInvocation(input) {
  const parsed = parseCommandArguments(input);
  const bareAction = input.arguments.length === (parsed.action ? 1 : 0);
  const needsRequired =
    parsed.positional.length < (parsed.schema.minimum ?? 0) ||
    Object.entries(parsed.schema.flags ?? {}).some(
      ([name, flag]) => flag.required && !parsed.values[name],
    );
  const isBareInventory =
    input.commandName === "motion" &&
    (!parsed.action || parsed.action === "list");
  const hasFields =
    parsed.schema.positional ||
    parsed.schema.actions ||
    Object.keys(parsed.schema.flags ?? {}).length;
  const terminal =
    input.interactive !== false &&
    !isBareInventory &&
    hasFields &&
    (bareAction || needsRequired)
      ? TerminalSession.open()
      : undefined;
  try {
    const arguments_ = terminal
      ? await runCommandWizard({
          ...input,
          terminal,
          parsed,
          onlyMissing: !bareAction,
        })
      : input.arguments;
    return normalizeCommandArguments({
      ...input,
      parsed: parseCommandArguments({
        ...input,
        arguments: arguments_,
        requireValues: true,
      }),
    });
  } finally {
    terminal?.close();
  }
}
