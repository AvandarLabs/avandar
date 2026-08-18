import { execFile } from "node:child_process";
import * as net from "node:net";
import { promisify } from "node:util";
import { promiseMapSequential } from "@avandar/utils";
import type { CommandResult } from "@ava-cli/SupabaseCLI/SupabaseLocalEnvironment/SupabaseLocalEnvironment.types";

const execFileAsync = promisify(execFile);

/** Addresses a port must be free on before a local service may claim it. */
const PROBED_HOSTS = ["127.0.0.1", "0.0.0.0"] as const;

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

function _isHostPortAvailable(
  options: Readonly<{ port: number; host: string }>,
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", (error: NodeJS.ErrnoException) => {
      if (error.code === "EADDRINUSE" || error.code === "EACCES") {
        resolve(false);
        return;
      }
      reject(error);
    });
    server.listen(options.port, options.host, () => {
      server.close(() => {
        resolve(true);
      });
    });
  });
}

async function _isPortAvailable(port: number): Promise<boolean> {
  // Probe one host at a time: overlapping the binds would have each probe
  // competing with the socket the other one is holding.
  const availability = await promiseMapSequential(PROBED_HOSTS, (host) => {
    return _isHostPortAvailable({ port, host });
  });
  return availability.every(Boolean);
}

/** Runs local processes and probes local TCP ports. */
export const RunLocalCommand = {
  /**
   * Reports whether a port is free on every local address.
   *
   * Both a loopback and a wildcard bind have to succeed, because neither alone
   * sees every holder on macOS. Docker publishes a container port on the IPv6
   * wildcard while `127.0.0.1` stays bindable, so a loopback-only probe calls
   * another local Supabase stack's port free and the switch that follows dies
   * inside `supabase start`. BSD sockets then allow a wildcard bind alongside
   * an existing loopback one, so a wildcard-only probe misses a plain local
   * server.
   */
  isPortAvailable: _isPortAvailable,

  run: _runCommand,
};
