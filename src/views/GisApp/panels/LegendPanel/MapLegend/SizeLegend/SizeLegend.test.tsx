import { describe, expect, it } from "vitest";
import { render, screen } from "@/test-utils";
import { SizeLegend } from "@/views/GisApp/panels/LegendPanel/MapLegend/SizeLegend/SizeLegend";

describe("SizeLegend", () => {
  it("renders nested circles with frozen labels along one bottom edge", () => {
    render(
      <SizeLegend
        sizeStops={[
          { value: 4, radiusPx: 4, label: "4" },
          { value: 25, radiusPx: 14, label: "25" },
          { value: 100, radiusPx: 24, label: "100" },
        ]}
      />,
    );

    const graphic = screen.getByRole("img", {
      name: "Symbol sizes from 4 to 100",
    });
    const circles = [...graphic.querySelectorAll("circle")];

    expect(circles).toHaveLength(3);
    expect(
      circles.map((circle) => {
        return (
          Number(circle.getAttribute("cy")) + Number(circle.getAttribute("r"))
        );
      }),
    ).toEqual([48, 48, 48]);
    expect(
      circles.map((circle) => {
        return circle.getAttribute("r");
      }),
    ).toEqual(["4", "14", "24"]);
    expect(graphic.querySelectorAll("line")).toHaveLength(3);
    expect(graphic.textContent).toBe("425100");
    expect(screen.getAllByRole("img")).toHaveLength(1);
  });
});
