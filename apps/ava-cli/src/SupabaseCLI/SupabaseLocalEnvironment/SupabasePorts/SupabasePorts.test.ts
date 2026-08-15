import { SupabasePorts } from "@ava-cli/SupabaseCLI/SupabaseLocalEnvironment/SupabasePorts/SupabasePorts";
import { describe, expect, it, vi } from "vitest";

const PORTS = {
  "api.port": 54321,
  "db.port": 54322,
  "db.shadow_port": 54320,
  "studio.port": 54323,
  "inbucket.port": 51634,
  "edge_runtime.inspector_port": 8083,
  "analytics.port": 54327,
};

describe("makeDerivedPortsFromBasePort", () => {
  it("preserves every offset from the current API port", () => {
    expect(
      SupabasePorts.makeDerivedPortsFromBasePort({
        currentApiPort: 54321,
        currentPorts: PORTS,
        basePort: 55321,
      }),
    ).toEqual({
      "api.port": 55321,
      "db.port": 55322,
      "db.shadow_port": 55320,
      "studio.port": 55323,
      "inbucket.port": 52634,
      "edge_runtime.inspector_port": 9083,
      "analytics.port": 55327,
    });
  });

  it("rejects a derived port outside the TCP range", () => {
    expect(() => {
      SupabasePorts.makeDerivedPortsFromBasePort({
        currentApiPort: 54321,
        currentPorts: PORTS,
        basePort: 65530,
      });
    }).toThrow("outside the valid TCP port range");
  });

  it("rejects a non-integer derived port", () => {
    expect(() => {
      SupabasePorts.makeDerivedPortsFromBasePort({
        currentApiPort: 54321.5,
        currentPorts: PORTS,
        basePort: 55321,
      });
    }).toThrow("outside the valid TCP port range");
  });

  it("rejects a NaN derived port", () => {
    expect(() => {
      SupabasePorts.makeDerivedPortsFromBasePort({
        currentApiPort: Number.NaN,
        currentPorts: PORTS,
        basePort: 55321,
      });
    }).toThrow("outside the valid TCP port range");
  });
});

describe("getAvailableBasePortFromPorts", () => {
  it("rejects an explicit base when any derived port is occupied", async () => {
    const isPortAvailable = vi.fn(async (port: number) => {
      return port !== 55322;
    });
    await expect(
      SupabasePorts.getAvailableBasePortFromPorts({
        currentApiPort: 54321,
        currentPorts: PORTS,
        requestedBasePort: 55321,
        isPortAvailable,
      }),
    ).rejects.toThrow("55322 is already in use");
  });

  it("skips occupied automatic candidates and returns the first free set", async () => {
    const isPortAvailable = vi.fn(async (port: number) => {
      return port !== 55321;
    });
    await expect(
      SupabasePorts.getAvailableBasePortFromPorts({
        currentApiPort: 54321,
        currentPorts: PORTS,
        isPortAvailable,
      }),
    ).resolves.toBe(55341);
  });
});
