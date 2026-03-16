import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useToggleBoolean } from "./useToggleBoolean";

describe("useToggleBoolean", () => {
  it("returns initial state", () => {
    const { result: resultTrue } = renderHook(() => {
      return useToggleBoolean(true);
    });
    const { result: resultFalse } = renderHook(() => {
      return useToggleBoolean(false);
    });
    expect(resultTrue.current[0]).toBe(true);
    expect(resultFalse.current[0]).toBe(false);
  });

  it("toggle flips state from false to true", () => {
    const { result } = renderHook(() => {
      return useToggleBoolean(false);
    });
    act(() => {
      result.current[1](); // toggle fn
    });
    expect(result.current[0]).toBe(true);
    act(() => {
      result.current[1](); // toggle fn
    });
    expect(result.current[0]).toBe(false);
  });
});
