import { IconPuzzle } from "@tabler/icons-react";
import { createElement, memo } from "react";
import { describe, expect, it } from "vitest";
import { isPluginIconComponent } from "@/lib/plugins/isPluginIconComponent/isPluginIconComponent";

describe("isPluginIconComponent", () => {
  it("accepts a Tabler icon, which is a forwardRef component", () => {
    expect(isPluginIconComponent(IconPuzzle)).toBe(true);
  });

  it("accepts a plain function component", () => {
    expect(
      isPluginIconComponent(() => {
        return createElement("svg");
      }),
    ).toBe(true);
  });

  it("accepts a memoized component", () => {
    const MemoIcon = memo(() => {
      return createElement("svg");
    });

    expect(isPluginIconComponent(MemoIcon)).toBe(true);
  });

  it("rejects the empty object a JSON round trip leaves where a component was", () => {
    expect(isPluginIconComponent(JSON.parse(JSON.stringify(IconPuzzle)))).toBe(
      false,
    );
  });

  it.each([undefined, null, "IconPuzzle", 42, {}, []])(
    "rejects %j",
    (value) => {
      expect(isPluginIconComponent(value)).toBe(false);
    },
  );
});
