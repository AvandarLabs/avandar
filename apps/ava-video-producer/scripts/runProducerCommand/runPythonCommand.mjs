import { spawn } from "node:child_process";
import { CliOutput } from "./CliOutput/CliOutput.mjs";
import { packageHelp } from "./packageHelp.mjs";

const [commandName, script, ...argv] = process.argv.slice(2);
if (argv.some((value) => ["--help", "-h"].includes(value))) {
  process.stdout.write(packageHelp({ commandName, arguments: argv }));
} else {
  try {
    const { prepareCommandInvocation } =
      await import("./prepareCommandInvocation.mjs");
    const invocation = await prepareCommandInvocation({
      commandName,
      arguments: argv,
      direct: true,
      interactive: !(
        process.env.AVA_PRODUCER_PREPARED_COMMAND === commandName ||
        (commandName === "render:showcase" &&
          process.env.AVA_PRODUCER_PREPARED_COMMAND === "preview:showcase")
      ),
    });
    CliOutput.progress(`Starting ${commandName}.`);
    const child = spawn("python3", [script, ...invocation.arguments], {
      env: {
        ...process.env,
        ...invocation.environment,
        AVA_PRODUCER_ACTIVE_PYTHON: script,
      },
      stdio: "inherit",
    });
    const timer = setInterval(
      () => CliOutput.progress(`${commandName} is still working.`),
      15000,
    );
    const result = await new Promise((resolve, reject) => {
      child.once("error", reject);
      child.once("exit", (code, signal) => resolve({ code, signal }));
    }).finally(() => clearInterval(timer));
    if (result.signal) process.kill(process.pid, result.signal);
    else process.exitCode = result.code ?? 1;
    if (process.exitCode)
      CliOutput.error(
        `${commandName} failed.`,
        `Review the diagnostics above and retry. Run pnpm ${commandName} --help for usage.`,
      );
    else
      CliOutput.success(
        commandName === "data:validate"
          ? "Validated fictional fixture files and manifest under demo-data/."
          : invocation.arguments.includes("--model")
            ? "Printed the fictional data model as JSON."
            : invocation.arguments.includes("--check")
              ? "Fixture regeneration matches the checked-in demo-data files."
              : "Generated five fictional CSVs and demo-data/manifest.json.",
      );
  } catch (error) {
    CliOutput.error(
      error instanceof Error ? error.message : String(error),
      `Correct the invocation and retry. Run pnpm ${commandName} --help.`,
    );
    process.stderr.write(packageHelp({ commandName, arguments: argv }));
    process.exitCode = 1;
  }
}
