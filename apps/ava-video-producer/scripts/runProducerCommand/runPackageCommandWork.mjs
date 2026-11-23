import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { CliOutput } from "./CliOutput/CliOutput.mjs";

/**
 * Streams a licensed command, preserving its prerequisites and failure status.
 * @param {Readonly<{ command: string, arguments: readonly string[] }>} input
 * @returns {Promise<number>}
 */
export async function runPackageCommandWork(input) {
  const child = spawn(
    "sh",
    ["-c", `${input.command} "$@"`, "producer-command", ...input.arguments],
    {
      cwd: fileURLToPath(new URL("../../", import.meta.url)),
      stdio: "inherit",
    },
  );
  const timer = setInterval(
    () => CliOutput.progress("Producer command is still working."),
    15000,
  );
  try {
    const result = await new Promise((resolve, reject) => {
      child.once("error", reject);
      child.once("exit", (code, signal) => resolve({ code, signal }));
    });
    if (result.signal) process.kill(process.pid, result.signal);
    const status = result.code ?? 1;
    if (status)
      CliOutput.error(
        "Producer command failed.",
        "Review the diagnostics above, resolve the reported problem and retry the same command.",
      );
    else CliOutput.success("Producer command completed.");
    return status;
  } catch (error) {
    CliOutput.error(
      `Producer command could not start: ${error instanceof Error ? error.message : String(error)}`,
      "Check that command dependencies are installed, then retry.",
    );
    return 1;
  } finally {
    clearInterval(timer);
  }
}
