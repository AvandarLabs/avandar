import { isDesktop } from "$/platform/isDesktop.ts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { fakeDbClient } = vi.hoisted(() => {
  return {
    fakeDbClient: {
      rpc: vi.fn(),
      functions: { invoke: vi.fn() },
    } as unknown,
  };
});

vi.mock("$/platform/isDesktop.ts", async () => {
  const actual = await vi.importActual<typeof import("$/platform/isDesktop.ts")>(
    "$/platform/isDesktop.ts",
  );
  return { ...actual, isDesktop: vi.fn(() => false) };
});

vi.mock("$/db/supabase/AvaSupabase.ts", () => {
  return {
    AvaSupabase: {
      db: () => {
        return fakeDbClient;
      },
    },
  };
});

import { createServerApiClient } from "./createServerApiClient.ts";

describe("createServerApiClient", () => {
  beforeEach(() => {
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
