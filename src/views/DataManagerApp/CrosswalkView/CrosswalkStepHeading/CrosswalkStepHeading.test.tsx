import { describe, expect, it } from "vitest";
import { render, screen } from "@/test-utils";
import { CrosswalkStepHeading } from "@/views/DataManagerApp/CrosswalkView/CrosswalkStepHeading/CrosswalkStepHeading";

const LABELS = {
  datasets: "Choose datasets",
  map: "Map each dataset",
  combine: "Create combined dataset",
};

describe("CrosswalkStepHeading", () => {
  it("names the current step and leaves focus alone when the view opens", () => {
    render(<CrosswalkStepHeading step="datasets" labels={LABELS} />);
    expect(
      screen.getByRole("heading", { level: 2, name: "Choose datasets" }),
    ).not.toHaveFocus();
  });

  it("moves focus to the heading when the step changes", () => {
    const { rerender } = render(
      <CrosswalkStepHeading step="datasets" labels={LABELS} />,
    );
    rerender(<CrosswalkStepHeading step="map" labels={LABELS} />);
    expect(
      screen.getByRole("heading", { name: "Map each dataset" }),
    ).toHaveFocus();
  });
});
