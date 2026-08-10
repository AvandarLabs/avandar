import { createServerApiClient } from "$/ServerApiClient/createServerApiClient.ts";
import { isDesktop } from "$/platform/isDesktop.ts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { fakeCallIpc, fakeDbClient } = vi.hoisted(() => {
  return {
    fakeCallIpc: vi.fn(),
    fakeDbClient: {
      rpc: vi.fn(),
      functions: { invoke: vi.fn() },
    } as unknown,
  };
});

vi.mock("$/platform/ipc/client.ts", () => {
  return { callIpc: fakeCallIpc };
});

vi.mock("$/platform/isDesktop.ts", async () => {
  const actual = await vi.importActual<
    typeof import("$/platform/isDesktop.ts")
  >("$/platform/isDesktop.ts");
  return {
    ...actual,
    isDesktop: vi.fn(() => {
      return false;
    }),
  };
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

describe("createServerApiClient", () => {
  beforeEach(() => {
    (isDesktop as ReturnType<typeof vi.fn>).mockReturnValue(false);
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("routes web RPC calls through the Supabase adapter", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { ok: true }, error: null });
    (fakeDbClient as { rpc: typeof rpc }).rpc = rpc;
    const client = createServerApiClient();
    await expect(client.rpc("healthcheck", { verbose: true })).resolves.toEqual(
      { ok: true },
    );
    expect(rpc).toHaveBeenCalledWith("healthcheck", { verbose: true });
    expect(fakeCallIpc).not.toHaveBeenCalled();
  });

  it("routes desktop RPC calls through the IPC adapter", async () => {
    (isDesktop as ReturnType<typeof vi.fn>).mockReturnValue(true);
    fakeCallIpc.mockResolvedValue({ ok: true });
    const client = createServerApiClient();
    await expect(client.rpc("healthcheck", { verbose: true })).resolves.toEqual(
      { ok: true },
    );
    expect(fakeCallIpc).toHaveBeenCalledWith(expect.any(Object), {
      name: "healthcheck",
      args: { verbose: true },
    });
  });
});
