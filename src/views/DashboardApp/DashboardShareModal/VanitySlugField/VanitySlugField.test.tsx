import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@/test-utils";
import { VanitySlugField } from "@/views/DashboardApp/DashboardShareModal/VanitySlugField/VanitySlugField";

describe("VanitySlugField", () => {
  it("does not preview the URL under the custom path field", () => {
    render(
      <VanitySlugField
        slugInput="first-dash"
        normalisedSlug="first-dash"
        hasPendingCheck={false}
        isAccepted
        onChange={vi.fn()}
      />,
    );

    expect(screen.queryByText("Preview:")).toBeNull();
    expect(screen.queryByText("/d/first-dash")).toBeNull();
  });

  it("prefixes the path field with the site URL and hides the heading", () => {
    render(
      <VanitySlugField
        slugInput="first-dash"
        normalisedSlug="first-dash"
        hasPendingCheck={false}
        isAccepted
        urlPrefix="https://app.example.com/d/"
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText("https://app.example.com/d/")).toBeInTheDocument();
    expect(screen.queryByText("Custom URL (optional)")).toBeNull();
    expect(
      screen.getByRole("textbox", { name: "Custom URL path" }),
    ).toHaveValue("first-dash");
  });
});
