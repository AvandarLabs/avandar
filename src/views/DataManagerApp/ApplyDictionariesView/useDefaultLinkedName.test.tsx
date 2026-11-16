import { describe, expect, it } from "vitest";
import { renderHook, TestProviders } from "@/test-utils";
import { SEX_PICK } from "@/views/DataManagerApp/ApplyDictionariesView/__tests__/applyFlow.fixtures";
import { useDefaultLinkedName } from "@/views/DataManagerApp/ApplyDictionariesView/useDefaultLinkedName";

function _nameFor(directions: ReadonlyArray<"decode" | "encode">): string {
  const picks = Object.fromEntries(
    directions.map((direction, index) => {
      return [`col-${index}`, { ...SEX_PICK, direction }] as const;
    }),
  );
  return renderHook(
    () => {
      return useDefaultLinkedName("Bronx line list", picks);
    },
    { wrapper: TestProviders },
  ).result.current;
}

describe("useDefaultLinkedName", () => {
  it("names the linked dataset by what its conversions do", () => {
    expect(_nameFor(["decode", "decode"])).toBe("Bronx line list (labeled)");
    expect(_nameFor(["encode"])).toBe("Bronx line list (coded)");
    expect(_nameFor(["decode", "encode"])).toBe("Bronx line list (converted)");
  });
});
