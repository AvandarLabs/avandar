/** Returns the supported terminal invocation for a producer command name. */
export function buildCommandInvocationFromName(commandName) {
  return commandName === "add-sfx"
    ? "sh scripts/add-sfx.sh"
    : `pnpm ${commandName}`;
}
