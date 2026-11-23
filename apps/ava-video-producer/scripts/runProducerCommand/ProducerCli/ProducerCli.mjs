import path from "node:path";
import { pathToFileURL } from "node:url";
import { CliOutput } from "../CliOutput/CliOutput.mjs";
import { packageHelp } from "../packageHelp.mjs";

function _failure(commandName, error, shouldShowUsage = true) {
  CliOutput.error(
    error instanceof Error ? error.message : String(error),
    `Run pnpm ${commandName} --help, correct the reported issue, and retry.`,
  );
  if (
    shouldShowUsage &&
    /usage:|missing required|invalid|unknown|repeated/i.test(
      error instanceof Error ? error.message : String(error),
    )
  )
    process.stderr.write(
      packageHelp({ commandName, arguments: process.argv.slice(2) }),
    );
  process.exitCode = 1;
}

/**
 * Performs direct-entry help and validation before the license guard or work.
 */
async function _prepare({ commandName, moduleUrl }) {
  if (
    !process.argv[1] ||
    pathToFileURL(path.resolve(process.argv[1])).href !== moduleUrl
  )
    return;
  const arguments_ = process.argv.slice(2);
  if (arguments_.some((value) => ["--help", "-h"].includes(value))) {
    process.stdout.write(packageHelp({ commandName, arguments: arguments_ }));
    process.exit(0);
  }
  const report = (error) => {
    _failure(commandName, error);
    process.exit(1);
  };
  process.once("uncaughtException", report);
  process.once("unhandledRejection", report);
  if (process.env.AVA_PRODUCER_PREPARED_COMMAND === commandName) return;
  try {
    const invocation = await _prepareDirectArguments({
      commandName,
      arguments: arguments_,
    });
    Object.assign(process.env, invocation.environment);
    process.argv.splice(2, process.argv.length - 2, ...invocation.arguments);
    CliOutput.progress(`Starting ${commandName}.`);
    setInterval(
      () => CliOutput.progress(`${commandName} is still working.`),
      15000,
    ).unref();
  } catch (error) {
    _failure(commandName, error, false);
    process.stderr.write(packageHelp({ commandName, arguments: arguments_ }));
    process.exit(1);
  }
}

/**
 * Shared preparation and failure reporting for native TypeScript entrypoints.
 */
export const ProducerCli = {
  /**
   * Prepares direct CLI arguments while leaving imported business APIs inert.
   */
  prepare: _prepare,
  /** Reports a failed operation with recovery guidance. */
  failure: _failure,
};

/** Returns direct-command values after the help-only branch has completed. */
async function _prepareDirectArguments({ commandName, arguments: argv }) {
  const { prepareCommandInvocation } =
    await import("../prepareCommandInvocation.mjs");
  return prepareCommandInvocation({
    commandName,
    arguments: argv,
    direct: true,
  });
}
