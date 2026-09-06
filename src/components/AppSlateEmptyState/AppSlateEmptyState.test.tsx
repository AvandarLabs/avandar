import { describe, expect, it } from "vitest";
import { AppSlateEmptyState } from "@/components/AppSlateEmptyState/AppSlateEmptyState";
import { render, screen } from "@/test-utils";

describe("AppSlateEmptyState", () => {
  it("renders the heading, supporting copy, and optional action", () => {
    render(
      <AppSlateEmptyState
        title="Select a County"
        message="Pick one from the list to see its details."
        action={<button type="button">Open case type</button>}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Select a County" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Pick one from the list to see its details."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Open case type" }),
    ).toBeInTheDocument();
  });
});
