import { buildCommandInvocationFromName } from "./buildCommandInvocationFromName.mjs";
import { getCanonicalCommandFromName } from "./getCanonicalCommandFromName.mjs";
import { packageHelp } from "./packageHelp.mjs";
import { PRODUCER_COMMANDS } from "./producerCommands.constants.mjs";
import { rootPackageHelp } from "./rootPackageHelp.mjs";

/**
 * Routes help before license, configuration, build, or dependency IO.
 * @returns {Promise<void>}
 */
async function _runProducerCommand() {
  const argv = process.argv.slice(2);
  const [requestedCommandName, ...commandArguments] = argv;
  const commandName = getCanonicalCommandFromName(requestedCommandName);
  if (requestedCommandName === "captures") commandArguments.unshift("--list");
  const isKnownCommand = Object.hasOwn(PRODUCER_COMMANDS, commandName);
  if (
    argv.some((argument) => {
      return argument === "--help" || argument === "-h";
    })
  ) {
    process.stdout.write(
      isKnownCommand
        ? packageHelp({ commandName, arguments: commandArguments })
        : rootPackageHelp(),
    );
    return;
  }
  if (!isKnownCommand) {
    const { CliOutput } = await import("./CliOutput/CliOutput.mjs");
    CliOutput.error(
      `Unknown producer package command: ${requestedCommandName ?? "(missing)"}.`,
      "Select a command from the usage below, then retry.",
    );
    process.stderr.write(rootPackageHelp());
    process.exitCode = 1;
    return;
  }
  await _runKnownCommand({ commandName, commandArguments });
}

async function _runKnownCommand({ commandName, commandArguments }) {
  const definition = PRODUCER_COMMANDS[commandName];
  // Lifecycle shims stay inert: npm does not forward help arguments to hooks.
  // Their real prerequisites belong to the test and typecheck command bodies.
  if (definition.command) {
    const { runPackageCommandWork } =
      await import("./runPackageCommandWork.mjs");
    const { prepareCommandInvocation } =
      await import("./prepareCommandInvocation.mjs");
    try {
      const invocation = await prepareCommandInvocation({
        commandName,
        arguments: commandArguments,
      });
      const { CliOutput } = await import("./CliOutput/CliOutput.mjs");
      CliOutput.progress(`Starting ${commandName}.`);
      Object.assign(process.env, invocation.environment);
      process.env.AVA_PRODUCER_PREPARED_COMMAND = commandName;
      process.exitCode = await runPackageCommandWork({
        command: definition.command,
        arguments: invocation.arguments,
      });
    } catch (error) {
      const { CliOutput } = await import("./CliOutput/CliOutput.mjs");
      CliOutput.error(
        error instanceof Error ? error.message : String(error),
        `Run ${buildCommandInvocationFromName(commandName)} --help, correct the invocation, and retry.`,
      );
      process.stderr.write(
        packageHelp({ commandName, arguments: commandArguments }),
      );
      process.exitCode = 1;
    }
  }
}

await _runProducerCommand();
