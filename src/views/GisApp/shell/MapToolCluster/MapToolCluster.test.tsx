import { describe, expect, it } from "vitest";
import { render, screen } from "@/test-utils";
import { MapToolCluster } from "@/views/GisApp/shell/MapToolCluster/MapToolCluster";

describe("MapToolCluster", () => {
  it("keeps pan active and explains unavailable tools accessibly", () => {
    render(<MapToolCluster />);

    expect(screen.getByRole("toolbar", { name: "Map tools" })).toHaveAttribute(
      "id",
      "gis-map-tools",
    );
    expect(
      screen.getByRole("button", { name: "Pan and select" }),
    ).toHaveAttribute("aria-pressed", "true");

    const unavailableTool = screen.getByRole("button", {
      name: "Measure distance and area. This tool is not available.",
    });
    expect(unavailableTool).toHaveAttribute("aria-disabled", "true");
  });
});
