import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useBoolean } from "./useBoolean";

describe("useBoolean", () => {
  it("returns initial state", () => {
    const { result: resultTrue } = renderHook(() => {
      return useBoolean(true);
    });
    const { result: resultFalse } = renderHook(() => {
      return useBoolean(false);
    });
    expect(resultTrue.current[0]).toBe(true);
    expect(resultFalse.current[0]).toBe(false);
  });

  it("setTrue and setFalse sets state correctly", () => {
    const { result } = renderHook(() => {
      return useBoolean(false);
    });
    act(() => {
      result.current[1](); // setTrue
    });
    expect(result.current[0]).toBe(true);
    act(() => {
      result.current[2](); // setFalse
    });
    expect(result.current[0]).toBe(false);
  });

  it("toggle flips boolean state", () => {
    const { result } = renderHook(() => {
      return useBoolean(false);
    });
    act(() => {
      result.current[3](); // toggle fn
    });
    expect(result.current[0]).toBe(true);
    act(() => {
      result.current[3]();
    });
    expect(result.current[0]).toBe(false);
  });
});
