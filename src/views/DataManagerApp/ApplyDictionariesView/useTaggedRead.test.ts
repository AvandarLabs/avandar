import { describe, expect, it } from "vitest";
import { act, renderHook, waitFor } from "@/test-utils";
import { useTaggedRead } from "@/views/DataManagerApp/ApplyDictionariesView/useTaggedRead";

function _deferred<Value>() {
  let resolve: (value: Value) => void = () => {};
  const promise = new Promise<Value>((resolver) => {
    resolve = resolver;
  });
  return { promise, resolve };
}

describe("useTaggedRead", () => {
  it("drops a reply that arrives after the key changed", async () => {
    const first = _deferred<string>();
    const second = _deferred<string>();
    const { result, rerender } = renderHook(
      ({ readKey, read }) => {
        return useTaggedRead({ key: readKey, read, devMsg: "test" });
      },
      {
        initialProps: {
          readKey: "a" as string | undefined,
          read: () => {
            return first.promise;
          },
        },
      },
    );

    rerender({
      readKey: "b",
      read: () => {
        return second.promise;
      },
    });
    await act(async () => {
      first.resolve("late");
    });
    expect(result.current).toEqual({ status: "reading" });

    await act(async () => {
      second.resolve("current");
    });
    await waitFor(() => {
      expect(result.current).toEqual({ status: "ready", result: "current" });
    });
  });

  it("reads nothing without a key and reports a failed read", async () => {
    const { result, rerender } = renderHook(
      ({ readKey }) => {
        return useTaggedRead({
          key: readKey,
          read: () => {
            return Promise.reject(new Error("no"));
          },
          devMsg: "test",
        });
      },
      { initialProps: { readKey: undefined as string | undefined } },
    );
    expect(result.current).toEqual({ status: "reading" });

    rerender({ readKey: "a" });
    await waitFor(() => {
      expect(result.current).toEqual({ status: "failed" });
    });
  });
});
