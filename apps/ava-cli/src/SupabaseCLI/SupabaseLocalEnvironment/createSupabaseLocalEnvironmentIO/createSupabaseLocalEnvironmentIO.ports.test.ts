import * as net from "node:net";
import path from "node:path";
import { createSupabaseLocalEnvironmentIO } from "@ava-cli/SupabaseCLI/SupabaseLocalEnvironment/createSupabaseLocalEnvironmentIO/createSupabaseLocalEnvironmentIO";
import { afterEach, describe, expect, it, vi } from "vitest";

const commandMocks = vi.hoisted(() => {
  return { execFile: vi.fn() };
});

vi.mock("node:child_process", () => {
  return { execFile: commandMocks.execFile };
});

afterEach(() => {
  commandMocks.execFile.mockReset();
});

function _setCommandFailure(
  options: Readonly<{ stderr: string; stdout: string }>,
): void {
  commandMocks.execFile.mockImplementation((...args) => {
    const callback = args.at(-1);
    if (typeof callback !== "function") {
      throw new Error("Expected execFile callback.");
    }
    callback(
      Object.assign(new Error("Command failed."), {
        stderr: options.stderr,
        stdout: options.stdout,
      }),
    );
  });
}

function _setCommandSuccess(
  results: ReadonlyArray<{ stderr: string; stdout: string }>,
): void {
  const remainingResults = [...results];
  commandMocks.execFile.mockImplementation((...args) => {
    const callback = args.at(-1);
    const result = remainingResults.shift();
    if (typeof callback !== "function" || result === undefined) {
      throw new Error("Expected an available execFile result and callback.");
    }
    callback(undefined, {
      stdout: result.stdout,
      stderr: result.stderr,
    });
  });
}

function _listenOnLoopback(): Promise<net.Server> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      resolve(server);
    });
  });
}

/** Binds the IPv6 wildcard the way Docker publishes a container port. */
function _listenOnAllInterfaces(): Promise<net.Server> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "::", () => {
      resolve(server);
    });
  });
}

function _closeServer(server: net.Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

describe("createSupabaseLocalEnvironmentIO (port probing)", () => {
  it("reports free and occupied loopback ports", async () => {
    const io = createSupabaseLocalEnvironmentIO(process.cwd());
    const occupiedServer = await _listenOnLoopback();
    const address = occupiedServer.address();
    if (address === null || typeof address === "string") {
      throw new Error("Expected a TCP loopback address.");
    }

    try {
      await expect(io.isPortAvailable(0)).resolves.toBe(true);
      await expect(io.isPortAvailable(address.port)).resolves.toBe(false);
    } finally {
      await _closeServer(occupiedServer);
    }
  });

  it("lists host ports Docker has already published", async () => {
    _setCommandSuccess([
      {
        stderr: "",
        stdout: "0.0.0.0:55322->5432/tcp, [::]:55322->5432/tcp\n",
      },
    ]);
    const projectRoot = path.resolve(process.cwd());
    const io = createSupabaseLocalEnvironmentIO(projectRoot);

    await expect(io.listPublishedHostPorts()).resolves.toEqual([55322]);
    expect(commandMocks.execFile).toHaveBeenCalledWith(
      "docker",
      ["ps", "--format", "{{.Ports}}"],
      {
        cwd: projectRoot,
        encoding: "utf8",
        maxBuffer: 10 * 1024 * 1024,
      },
      expect.any(Function),
    );
  });

  it("rejects published-port listing when Docker is unavailable", async () => {
    _setCommandFailure({ stderr: "Cannot connect to Docker.", stdout: "" });
    const io = createSupabaseLocalEnvironmentIO(process.cwd());

    await expect(io.listPublishedHostPorts()).rejects.toThrow(
      "Cannot list Docker published ports: Cannot connect to Docker.",
    );
  });

  it("reports a port published on every interface as occupied", async () => {
    const io = createSupabaseLocalEnvironmentIO(process.cwd());
    const occupiedServer = await _listenOnAllInterfaces();
    const address = occupiedServer.address();
    if (address === null || typeof address === "string") {
      throw new Error("Expected a TCP wildcard address.");
    }

    try {
      await expect(io.isPortAvailable(address.port)).resolves.toBe(false);
    } finally {
      await _closeServer(occupiedServer);
    }
  });
});
