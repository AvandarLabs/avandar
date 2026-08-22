/** Behavioral tests for discovery query retries. */
import { act } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderHook, TestProviders, waitFor } from "@/test-utils";
import { useDiscoveryOptions } from "./useDiscoveryOptions";
import type { DiscoveryResolver } from "@/components/ChatPanel/chatClarify.types";

const DISCOVERY_PARAMETERS = {
  query: 'SELECT DISTINCT "state" FROM "mortality"',
  column: "state",
} satisfies Pick<Parameters<typeof useDiscoveryOptions>[0], "query" | "column">;

describe("useDiscoveryOptions", () => {
  it("returns values when the third query attempt succeeds", async () => {
    const resolveDiscovery = vi
      .fn<DiscoveryResolver>()
      .mockResolvedValueOnce({ error: "first failure" })
      .mockRejectedValueOnce(new Error("second failure"))
      .mockResolvedValueOnce({ values: ["California"] });
    const { result } = renderHook(
      () => {
        return useDiscoveryOptions({
          ...DISCOVERY_PARAMETERS,
          resolveDiscovery,
        });
      },
      { wrapper: TestProviders },
    );

    await waitFor(() => {
      expect(result.current).toEqual({
        kind: "ready",
        values: ["California"],
      });
    });
    expect(resolveDiscovery).toHaveBeenCalledTimes(3);
  });

  it("returns a retryable error after three failed attempts", async () => {
    const resolveDiscovery = vi
      .fn<DiscoveryResolver>()
      .mockResolvedValue({ error: "query failed" });
    const { result } = renderHook(
      () => {
        return useDiscoveryOptions({
          ...DISCOVERY_PARAMETERS,
          resolveDiscovery,
        });
      },
      { wrapper: TestProviders },
    );

    await waitFor(() => {
      expect(result.current.kind).toBe("error");
    });
    expect(resolveDiscovery).toHaveBeenCalledTimes(3);
    act(() => {
      if (result.current.kind === "error") {
        result.current.retry();
      }
    });
    await waitFor(() => {
      expect(resolveDiscovery).toHaveBeenCalledTimes(6);
    });
    expect(result.current.kind).toBe("error");
  });
});
