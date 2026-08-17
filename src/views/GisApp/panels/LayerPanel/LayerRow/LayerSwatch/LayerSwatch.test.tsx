import { describe, expect, it } from "vitest";
import { render } from "@/test-utils";
import { LayerSwatch } from "@/views/GisApp/panels/LayerPanel/LayerRow/LayerSwatch/LayerSwatch";

describe("LayerSwatch", () => {
  it("uses the hottest ramp stop for a heatmap", () => {
    const { container } = render(
      <LayerSwatch
        symbology={{
          type: "heatmap",
          radiusPx: 30,
          weight: undefined,
          ramp: ["#fff7bc", "#d7301f"],
        }}
      />,
    );

    expect(container.querySelector("span")).toHaveStyle({
      backgroundColor: "#d7301f",
    });
  });
});
