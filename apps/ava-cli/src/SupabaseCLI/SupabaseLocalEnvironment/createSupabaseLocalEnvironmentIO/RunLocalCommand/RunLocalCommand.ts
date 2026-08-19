import { execFile, spawn } from "node:child_process";
import * as net from "node:net";
import { promisify } from "node:util";
import { promiseMapSequential } from "@avandar/utils";
import type {
  CommandOutputMode,
  CommandResult,
} from "@ava-cli/SupabaseCLI/SupabaseLocalEnvironment/SupabaseLocalEnvironment.types";

const execFileAsync = promisify(execFile);

type RunCommandOptions = {
  command: string;
  args: readonly string[];
  cwd: string;
  env?: Readonly<Record<string, string>>;
  outputMode?: CommandOutputMode;
  transformStreamLine?: (line: string) => string;
};

function _createLineForwarder(
  options: Readonly<{
    write: (contents: string) => unknown;
    transformLine?: (line: string) => string;
  }>,
): { write: (chunk: string) => void; flush: () => void } {
  let bufferedContents = "";
  return {
    write: (chunk) => {
      const lines = `${bufferedContents}${chunk}`.split("\n");
      bufferedContents = lines.pop() ?? "";
      lines.forEach((line) => {
        const transformedLine = options.transformLine?.(line) ?? line;
        options.write(`${transformedLine}\n`);
      });
    },
    flush: () => {
      if (bufferedContents === "") {
        return;
      }
      options.write(
        options.transformLine?.(bufferedContents) ?? bufferedContents,
      );
      bufferedContents = "";
    },
  };
}

function _createOutputForwarders(
  transformLine?: (line: string) => string,
): {
  stdout: ReturnType<typeof _createLineForwarder>;
  stderr: ReturnType<typeof _createLineForwarder>;
} {
  return {
    stdout: _createLineForwarder({
      write: (contents) => {
        return process.stdout.write(contents);
      },
      transformLine,
    }),
    stderr: _createLineForwarder({
      write: (contents) => {
        return process.stderr.write(contents);
      },
      transformLine,
    }),
  };
}

function _flushOutputForwarders(
  outputForwarders: ReturnType<typeof _createOutputForwarders>,
): void {
  outputForwarders.stdout.flush();
  outputForwarders.stderr.flush();
}

function _runStreamingCommand(
  options: Readonly<RunCommandOptions>,
): Promise<CommandResult> {
  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    let hasSettled = false;
    const outputForwarders = _createOutputForwarders(
      options.transformStreamLine,
    );
    const childProcess = spawn(options.command, [...options.args], {
      cwd: options.cwd,
      env: options.env ? { ...process.env, ...options.env } : undefined,
      stdio: ["ignore", "pipe", "pipe"],
    });
    childProcess.stdout.setEncoding("utf8");
    childProcess.stderr.setEncoding("utf8");
    childProcess.stdout.on("data", (chunk: string) => {
      stdout = `${stdout}${chunk}`;
      outputForwarders.stdout.write(chunk);
    });
    childProcess.stderr.on("data", (chunk: string) => {
      stderr = `${stderr}${chunk}`;
      outputForwarders.stderr.write(chunk);
    });
    childProcess.once("error", (error) => {
      hasSettled = true;
      _flushOutputForwarders(outputForwarders);
      resolve({ ok: false, stdout: stdout.trim(), stderr: error.message });
    });
    childProcess.once("close", (exitCode) => {
      if (hasSettled) {
        return;
      }
      _flushOutputForwarders(outputForwarders);
      resolve({
        ok: exitCode === 0,
        stdout: stdout.trim(),
        stderr:
          stderr.trim() ||
          (exitCode === 0 ? "" : `Command exited with code ${exitCode}.`),
      });
    });
  });
}

/** Addresses a port must be free on before a local service may claim it. */
const PROBED_HOSTS = ["127.0.0.1", "0.0.0.0"] as const;

async function _runCommand(
  options: Readonly<RunCommandOptions>,
): Promise<CommandResult> {
  if (options.outputMode === "stream") {
    return await _runStreamingCommand(options);
  }
  try {
    const result = await execFileAsync(options.command, [...options.args], {
      cwd: options.cwd,
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
      // Only set `env` when there is something to override: passing it always
      // would replace the inherited environment with a copy, which is a
      // different call than every existing caller makes.
      ...(options.env ? { env: { ...process.env, ...options.env } } : {}),
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
