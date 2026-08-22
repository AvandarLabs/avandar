import { describe, expect, it } from "vitest";
import { NuxTourCaret } from "@/components/Nux/NuxTour/NuxTourCaret/NuxTourCaret";
import { render } from "@/test-utils";

describe("NuxTourCaret", () => {
  it("clips against the tooltip using the placement's main side", () => {
    const { container } = render(
      <NuxTourCaret base={32} size={16} placement="right-start" />,
    );

    expect(container.querySelector("[data-side]")).toHaveAttribute(
      "data-side",
      "right",
    );
  });
});
