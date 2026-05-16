import { isDesktop } from "$/platform";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("$/platform", async () => {
  const actual = await vi.importActual<typeof import("$/platform")>(
    "$/platform",
  );
  return { ...actual, isDesktop: vi.fn(() => false) };
});

import { registerWebDbClient } from "@clients/webDbClientRegistry.ts";
import { createServerApiClient } from "./createServerApiClient.ts";

const fakeDbClient = {
  rpc: vi.fn(),
  functions: { invoke: vi.fn() },
} as unknown as Parameters<typeof registerWebDbClient>[0];

describe("createServerApiClient", () => {
  beforeEach(() => {
    registerWebDbClient(fakeDbClient);
    (isDesktop as ReturnType<typeof vi.fn>).mockReturnValue(false);
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns the browser-backed adapter on web with rpc and invokeFunction methods", () => {
    const client = createServerApiClient();
    expect(client).toBeDefined();
    expect(typeof client.rpc).toBe("function");
    expect(typeof client.invokeFunction).toBe("function");
  });

  it(
    "also returns the browser-backed adapter on desktop in Phase 1 " +
      "(Option A — Phase 2 wires the IPC adapter here)",
    () => {
      (isDesktop as ReturnType<typeof vi.fn>).mockReturnValue(true);
      const client = createServerApiClient();
      expect(typeof client.rpc).toBe("function");
      expect(typeof client.invokeFunction).toBe("function");
    },
  );
});
