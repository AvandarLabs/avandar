import { DevServerPort } from "@ava-cli/SupabaseCLI/SupabaseLocalEnvironment/DevServerPort/DevServerPort";
import { describe, expect, it, vi } from "vitest";

async function _alwaysAvailable(): Promise<boolean> {
  return true;
}

describe("DevServerPort.fromEnvContents", () => {
  it("prefers the pinned port over the app URL port", () => {
    expect(
      DevServerPort.fromEnvContents(
        "VITE_APP_URL=http://localhost:5173/\nAVA_VITE_DEV_PORT=6173\n",
      ),
    ).toBe(6173);
  });

  it("falls back to the port of a loopback app URL", () => {
    expect(
      DevServerPort.fromEnvContents("VITE_APP_URL=http://127.0.0.1:6173/\n"),
    ).toBe(6173);
  });

  it("ignores an app URL served from a remote host", () => {
    expect(
      DevServerPort.fromEnvContents(
        "VITE_APP_URL=https://app.avandarlabs.com/\n",
      ),
    ).toBeUndefined();
  });

  it("ignores a pinned port outside the TCP range", () => {
    expect(
      DevServerPort.fromEnvContents("AVA_VITE_DEV_PORT=70000"),
    ).toBeUndefined();
  });

  it("reads a quoted pinned port", () => {
    expect(DevServerPort.fromEnvContents('AVA_VITE_DEV_PORT="6173"')).toBe(
      6173,
    );
  });
});

describe("DevServerPort.fromEnvFiles", () => {
  it("returns the standard port when no file pins one", () => {
    expect(DevServerPort.fromEnvFiles(["MODE=development"])).toBe(5173);
  });

  it("returns the first port any file pins", () => {
    expect(
      DevServerPort.fromEnvFiles([
        "MODE=development",
        "AVA_VITE_DEV_PORT=6193",
      ]),
    ).toBe(6193);
  });
});

describe("DevServerPort.getAvailable", () => {
  it("shifts the port by the Supabase port delta", async () => {
    await expect(
      DevServerPort.getAvailable({
        currentDevServerPort: 5173,
        portDelta: 1000,
        reservedPorts: [],
        isPortAvailable: _alwaysAvailable,
      }),
    ).resolves.toBe(6173);
  });

  it("keeps the current port when no ports move", async () => {
    const isPortAvailable = vi.fn(_alwaysAvailable);
    await expect(
      DevServerPort.getAvailable({
        currentDevServerPort: 5173,
        portDelta: 0,
        reservedPorts: [],
        isPortAvailable,
      }),
    ).resolves.toBe(5173);
    expect(isPortAvailable).not.toHaveBeenCalled();
  });

  it("walks past an occupied derived port", async () => {
    await expect(
      DevServerPort.getAvailable({
        currentDevServerPort: 5173,
        portDelta: 1000,
        reservedPorts: [],
        isPortAvailable: async (port: number) => {
          return port !== 6173;
        },
      }),
    ).resolves.toBe(6174);
  });

  it("walks past a port already reserved by the Supabase set", async () => {
    await expect(
      DevServerPort.getAvailable({
        currentDevServerPort: 54_320,
        portDelta: 1,
        reservedPorts: [54_321, 54_322],
        isPortAvailable: _alwaysAvailable,
      }),
    ).resolves.toBe(54_323);
  });

  it("rejects a derived port outside the TCP range", async () => {
    await expect(
      DevServerPort.getAvailable({
        currentDevServerPort: 5173,
        portDelta: 61_000,
        reservedPorts: [],
        isPortAvailable: _alwaysAvailable,
      }),
    ).rejects.toThrow("outside the valid TCP port range");
  });
});

describe("DevServerPort.toDevelopmentEnv", () => {
  it("repoints a loopback app URL and appends the pinned port", () => {
    expect(
      DevServerPort.toDevelopmentEnv({
        envContents: "VITE_APP_URL=http://localhost:5173/\nUNRELATED=keep\n",
        devServerPort: 6173,
      }),
    ).toBe(
      "VITE_APP_URL=http://localhost:6173/\nUNRELATED=keep\n\n# Vite dev-server port for this worktree. Managed by `ava supabase switch`.\nAVA_VITE_DEV_PORT=6173\n",
    );
  });

  it("replaces an already pinned port in place", () => {
    expect(
      DevServerPort.toDevelopmentEnv({
        envContents: "AVA_VITE_DEV_PORT=6173\nUNRELATED=keep\n",
        devServerPort: 7173,
      }),
    ).toBe("AVA_VITE_DEV_PORT=7173\nUNRELATED=keep\n");
  });

  it("leaves an app URL served from a remote host alone", () => {
    expect(
      DevServerPort.toDevelopmentEnv({
        envContents: "VITE_APP_URL=https://app.avandarlabs.com/\n",
        devServerPort: 6173,
      }),
    ).toBe(
      "VITE_APP_URL=https://app.avandarlabs.com/\n\n# Vite dev-server port for this worktree. Managed by `ava supabase switch`.\nAVA_VITE_DEV_PORT=6173\n",
    );
  });
});
