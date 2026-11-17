import { describe, expect, it } from "vitest";
import { renderHook } from "@/test-utils";
import { useLookupState } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/useLookupState/useLookupState";

type Options = { hasFailed: boolean; isLoading: boolean };

function _renderLookupState(initial: Options) {
  return renderHook(
    (options: Options) => {
      return useLookupState(options);
    },
    { initialProps: initial },
  );
}

describe("useLookupState", () => {
  it("is ok on a first load", () => {
    const { result } = _renderLookupState({
      hasFailed: false,
      isLoading: true,
    });

    expect(result.current).toBe("ok");
  });

  it("is failed once a lookup failed and nothing is in flight", () => {
    const { result } = _renderLookupState({
      hasFailed: true,
      isLoading: false,
    });

    expect(result.current).toBe("failed");
  });

  it("is retrying while a lookup that failed loads again", () => {
    const { result, rerender } = _renderLookupState({
      hasFailed: true,
      isLoading: false,
    });

    rerender({ hasFailed: false, isLoading: true });

    expect(result.current).toBe("retrying");
  });

  it("is failed again when the retry fails", () => {
    const { result, rerender } = _renderLookupState({
      hasFailed: true,
      isLoading: false,
    });
    rerender({ hasFailed: false, isLoading: true });

    rerender({ hasFailed: true, isLoading: false });

    expect(result.current).toBe("failed");
  });

  it("is ok once a retry succeeds", () => {
    const { result, rerender } = _renderLookupState({
      hasFailed: true,
      isLoading: false,
    });
    rerender({ hasFailed: false, isLoading: true });

    rerender({ hasFailed: false, isLoading: false });

    expect(result.current).toBe("ok");
  });

  it("is ok, not retrying, when a lookup loads again after a retry succeeded", () => {
    const { result, rerender } = _renderLookupState({
      hasFailed: true,
      isLoading: false,
    });
    rerender({ hasFailed: false, isLoading: true });
    rerender({ hasFailed: false, isLoading: false });

    rerender({ hasFailed: false, isLoading: true });

    expect(result.current).toBe("ok");
  });
});
