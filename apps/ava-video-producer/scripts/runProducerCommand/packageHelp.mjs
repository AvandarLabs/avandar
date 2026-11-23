import { buildCommandInvocationFromName } from "./buildCommandInvocationFromName.mjs";
import { CliOutput } from "./CliOutput/CliOutput.mjs";
import { PRODUCER_COMMANDS } from "./producerCommands.constants.mjs";

/**
 * Builds complete command help without reading configuration or dependencies.
 * @param {Readonly<{
 *   commandName: string, arguments: readonly string[]
 * }>} input
 * @returns {string}
 */
export function packageHelp(input) {
  const definition = PRODUCER_COMMANDS[input.commandName];
  const subcommandName = input.arguments.find((argument) => {
    return !["--", "--help", "-h"].includes(argument);
  });
  const subcommand =
    definition.subcommands &&
    Object.hasOwn(definition.subcommands, subcommandName)
      ? definition.subcommands[subcommandName]
      : undefined;
  const selected = subcommand ?? definition;
  const invocation = `${buildCommandInvocationFromName(input.commandName)}${subcommand ? ` ${subcommandName}` : ""}`;
  const subcommandHelp =
    !subcommand && definition.subcommands
      ? Object.entries(definition.subcommands).flatMap(([name, details]) => {
          return [
            `  ${name} ${details.synopsis}`,
            ...details.details.map((detail) => {
              return `    ${detail}`;
            }),
          ];
        })
      : [];
  return [
    CliOutput.helpHeading(selected.purpose),
    "",
    CliOutput.helpHeading(
      `Usage: ${invocation}${selected.synopsis ? ` ${selected.synopsis}` : ""}`,
    ),
    "",
    ...selected.details,
    ...subcommandHelp,
    "",
    CliOutput.helpHeading("Options:"),
    "  Boolean flags also accept =true or =false to override inherited defaults.",
    "  -h, --help  Print this help and exit successfully, in any argument position.",
    "",
    CliOutput.helpHeading("Examples:"),
    ...selected.examples.map((example) => {
      return `  ${example}`;
    }),
    "",
  ].join("\n");
}
