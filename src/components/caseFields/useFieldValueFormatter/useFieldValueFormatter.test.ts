/**
 * Components read a field's value in the active locale, and yes or no in words.
 */
import { describe, expect, it } from "vitest";
import { useFieldValueFormatter } from "@/components/caseFields/useFieldValueFormatter/useFieldValueFormatter";
import { renderHook, TestProviders } from "@/test-utils";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";

function _format(dataType: AvaDataType.T, value: unknown): string {
  const { result } = renderHook(
    () => {
      return useFieldValueFormatter(dataType);
    },
    { wrapper: TestProviders },
  );
  return result.current(value);
}

describe("useFieldValueFormatter", () => {
  it("reads a boolean as yes or no", () => {
    expect(_format("boolean", true)).toBe("Yes");
    expect(_format("boolean", false)).toBe("No");
  });

  it("reads a date by the shared rules", () => {
    expect(_format("date", 1_709_596_800_000)).toBe("Mar 5, 2024");
  });
});
