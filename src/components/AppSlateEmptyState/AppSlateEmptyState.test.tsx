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

  it("sits flush on the surface behind it, with no card of its own", () => {
    const { container } = render(
      <AppSlateEmptyState
        title="Nothing in the catalog yet"
        message="Avandar prepares public datasets and publishes them here."
      />,
    );

    // The empty state fills a region that already paints its own surface, so
    // a bordered, shadowed box around it would draw an edge with no tonal
    // step on either side of it.
    expect(container.querySelector("[data-with-border]")).toBeNull();
    expect(container.querySelector(".mantine-Paper-root")).toBeNull();
  });
});
