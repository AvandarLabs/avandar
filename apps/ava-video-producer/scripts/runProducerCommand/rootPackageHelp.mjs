import { PRODUCER_COMMANDS } from "./producerCommands.constants.mjs";

/** Builds help for the native package-command dispatcher. @returns {string} */
export function rootPackageHelp() {
  return [
    "Run a licensed producer command, or inspect its help without prerequisites.",
    "",
    "Usage: node scripts/runProducerCommand/runProducerCommand.mjs <package-command> [arguments...]",
    "",
    "Commands:",
    ...Object.entries(PRODUCER_COMMANDS).map(([name, definition]) => {
      return `  ${name}: ${definition.purpose}`;
    }),
    "",
    "Options:",
    "  -h, --help  Print command help before any work, in any argument position.",
    "  arguments: forwarded unchanged to the selected package command.",
    "",
    "Examples:",
    "  node scripts/runProducerCommand/runProducerCommand.mjs video render --help",
    "  node scripts/runProducerCommand/runProducerCommand.mjs component:build",
    "",
  ].join("\n");
}
