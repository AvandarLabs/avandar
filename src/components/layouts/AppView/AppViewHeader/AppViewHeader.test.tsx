import { describe, expect, it } from "vitest";
import { AppViewHeader } from "@/components/layouts/AppView/AppViewHeader/AppViewHeader";
import { render, screen } from "@/test-utils";

describe("AppViewHeader", () => {
  it("shows the title accessory beside the name without adding it to the heading's name", () => {
    render(
      <AppViewHeader
        title="Case 001"
        titleAccessory={<button type="button">Status: Suspected</button>}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Case 001" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Status: Suspected" }),
    ).toBeInTheDocument();
  });
});
