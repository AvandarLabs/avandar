import { spawn } from "node:child_process";
import path from "node:path";
import type { RunOptions } from "./MediaHelpers.types";

function _getProcessExitError({
  command,
  exitCode,
  stderr,
}: Readonly<{ command: string; exitCode: string; stderr: string }>): Error {
  return new Error(
    `${path.basename(command)} exited ${exitCode}: ${stderr.slice(-3000)}`,
  );
}
/** Executes argument arrays without a shell and retains diagnostic stderr. */
export async function runProcess({
  command,
  args,
  options = {},
}: Readonly<{
  command: string;
  args: string[];
  options?: RunOptions;
}>): Promise<{
  stdout: string;
  stderr: string;
}> {
  return await new Promise<{
    stdout: string;
    stderr: string;
  }>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
      if (!options.quiet) {
        process.stdout.write(chunk);
      }
    });
    child.stderr.on("data", (chunk) => {
      stderr = (stderr + chunk).slice(-32000);
      if (!options.quiet) {
        process.stderr.write(chunk);
      }
    });
    child.on("error", reject);
    child.on("close", (code) => {
      return code === 0
        ? resolve({ stdout, stderr })
        : reject(
            _getProcessExitError({ command, exitCode: String(code), stderr }),
          );
    });
  });
}
