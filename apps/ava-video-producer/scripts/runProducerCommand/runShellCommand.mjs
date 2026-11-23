import { spawn } from "node:child_process";
import { buildCommandInvocationFromName } from "./buildCommandInvocationFromName.mjs";
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
    const child = spawn(
      commandName === "add-sfx" ? "bash" : "sh",
      [script, ...invocation.arguments],
      {
        env: {
          ...process.env,
          ...invocation.environment,
          AVA_PRODUCER_ACTIVE_SCRIPT: script,
        },
        stdio: ["inherit", "inherit", "inherit"],
      },
    );
    const timer = setInterval(
      () => CliOutput.progress(`${commandName} is still working.`),
      15000,
    );
    const status = await new Promise((resolve, reject) => {
      child.once("error", reject);
      child.once("exit", (code, signal) => resolve({ code, signal }));
    }).finally(() => clearInterval(timer));
    if (status.signal) process.kill(process.pid, status.signal);
    else process.exitCode = status.code ?? 1;
    if (process.exitCode)
      CliOutput.error(
        `${commandName} failed.`,
        `Review the diagnostics above, then retry the same command. Use ${buildCommandInvocationFromName(commandName)} --help for options.`,
      );
    else
      CliOutput.success(
        _getResultMessage({
          commandName,
          arguments: invocation.arguments,
          environment: { ...process.env, ...invocation.environment },
        }),
      );
  } catch (error) {
    CliOutput.error(
      error instanceof Error ? error.message : String(error),
      `Correct the invocation and retry. Use ${buildCommandInvocationFromName(commandName)} --help.`,
    );
    process.stderr.write(packageHelp({ commandName, arguments: argv }));
    process.exitCode = 1;
  }
}

function _getResultMessage({ commandName, arguments: argv, environment }) {
  const id = argv[0] ?? "demo";
  if (commandName === "render")
    return `Picture rendered and gated: ${environment.RENDER_OUT_DIR ?? "out"}/${environment.RENDER_OUTPUT_ID ?? id}.mp4`;
  if (commandName === "preview")
    return `Preview stills and contact sheet: out/${id}-preview/contact.jpg`;
  if (commandName === "add-sfx")
    return `Sound pass completed: out/${id}${environment.OUT_SUFFIX ?? "-sound"}.mp4`;
  if (commandName === "render:showcase")
    return "Checked showcase outputs are under out/. The showcase uses live components.";
  return `${commandName} completed.`;
}
