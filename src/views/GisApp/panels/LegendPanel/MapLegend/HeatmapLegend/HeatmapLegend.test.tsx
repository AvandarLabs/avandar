import { describe, expect, it } from "vitest";
import { render, screen } from "@/test-utils";
import { HeatmapLegend } from "@/views/GisApp/panels/LegendPanel/MapLegend/HeatmapLegend/HeatmapLegend";

describe("HeatmapLegend", () => {
  it("renders a nonnumeric low-to-high gradient", () => {
    render(<HeatmapLegend ramp={["#ffd4af", "#b97c44", "#7e3500"]} />);

    expect(screen.getByRole("img", { name: "Low to High" })).toHaveStyle({
      backgroundImage: "linear-gradient(to right, #ffd4af, #b97c44, #7e3500)",
    });
    expect(screen.getByText("Low")).toBeInTheDocument();
    expect(screen.getByText("High")).toBeInTheDocument();
    expect(screen.queryByText(/^(0|0\.5|1)$/)).not.toBeInTheDocument();
  });
});
