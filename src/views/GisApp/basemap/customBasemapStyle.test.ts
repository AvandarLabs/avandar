import { describe, expect, it } from "vitest";
import { BasemapStyle } from "@/views/GisApp/basemap/BasemapStyle";

describe("BasemapStyle.toKey", () => {
  it("changes when a custom basemap attribution changes", () => {
    const firstBasemap = {
      type: "custom",
      kind: "xyz",
      url: "https://tiles.example/{z}/{x}/{y}.png",
      attribution: "First attribution",
    } as const;
    const secondBasemap = {
      ...firstBasemap,
      attribution: "Second attribution",
    } as const;

    expect(BasemapStyle.toKey(firstBasemap)).not.toBe(
      BasemapStyle.toKey(secondBasemap),
    );
  });
});
