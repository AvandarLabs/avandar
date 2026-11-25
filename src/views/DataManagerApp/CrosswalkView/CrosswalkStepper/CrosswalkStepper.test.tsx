import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/test-utils";
import { CrosswalkStepper } from "@/views/DataManagerApp/CrosswalkView/CrosswalkStepper/CrosswalkStepper";
import type { CrosswalkStep } from "@/views/DataManagerApp/CrosswalkView/crosswalkReducer/crosswalkReducer.types";

const LABELS = {
  datasets: "Choose datasets",
  map: "Map each dataset",
  combine: "Create combined dataset",
};

function _renderStepper(
  step: CrosswalkStep,
  reachable: CrosswalkStep[],
  onStepClick = vi.fn(),
) {
  render(
    <CrosswalkStepper
      step={step}
      labels={LABELS}
      reachableSteps={new Set(reachable)}
      onStepClick={onStepClick}
    />,
  );
  return onStepClick;
}

describe("CrosswalkStepper", () => {
  it("shows all three steps", () => {
    _renderStepper("datasets", ["datasets"]);
    expect(
      screen.getByRole("button", { name: /Choose datasets/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Map each dataset/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Create combined dataset/ }),
    ).toBeInTheDocument();
  });

  it("opens a step the crosswalk can reach, ahead or behind", () => {
    const onStepClick = _renderStepper("datasets", [
      "datasets",
      "map",
      "combine",
    ]);
    fireEvent.click(
      screen.getByRole("button", { name: /Create combined dataset/ }),
    );
    expect(onStepClick).toHaveBeenCalledWith("combine");
  });

  it("does not open a step the crosswalk cannot reach yet", () => {
    const onStepClick = _renderStepper("datasets", ["datasets"]);
    fireEvent.click(screen.getByRole("button", { name: /Map each dataset/ }));
    expect(onStepClick).not.toHaveBeenCalled();
  });
});
