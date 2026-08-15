import { execFile } from "node:child_process";
import * as net from "node:net";
import { promisify } from "node:util";
import type { CommandResult } from "@ava-cli/SupabaseCLI/SupabaseLocalEnvironment/SupabaseLocalEnvironment.types";

const execFileAsync = promisify(execFile);

async function _runCommand(
  options: Readonly<{
    command: string;
    args: readonly string[];
    cwd: string;
  }>,
): Promise<CommandResult> {
  try {
    const result = await execFileAsync(options.command, [...options.args], {
      cwd: options.cwd,
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
    });
    return {
      ok: true,
      stdout: result.stdout.trim(),
      stderr: result.stderr.trim(),
    };
  } catch (error) {
    const commandError = error as {
      stdout?: string;
      stderr?: string;
      message?: string;
    };
    return {
      ok: false,
      stdout: commandError.stdout?.trim() ?? "",
      stderr:
        commandError.stderr?.trim() ?? commandError.message ?? "Command failed",
    };
  }
}

function _isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", (error: NodeJS.ErrnoException) => {
      if (error.code === "EADDRINUSE" || error.code === "EACCES") {
        resolve(false);
        return;
      }
      reject(error);
    });
    server.listen(port, "127.0.0.1", () => {
      server.close(() => {
        resolve(true);
      });
    });
  });
}

/** Runs local processes and probes local TCP ports. */
export const RunLocalCommand = {
  isPortAvailable: _isPortAvailable,
  run: _runCommand,
};
