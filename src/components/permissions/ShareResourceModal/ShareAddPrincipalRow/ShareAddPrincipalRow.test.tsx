import { describe, expect, it, vi } from "vitest";
import { ShareAddPrincipalRow } from "@/components/permissions/ShareResourceModal/ShareAddPrincipalRow/ShareAddPrincipalRow";
import { render, screen } from "@/test-utils";

describe("ShareAddPrincipalRow", () => {
  it("disables the Share button until a target is selected", () => {
    render(
      <ShareAddPrincipalRow
        members={[{ value: "u-1", label: "Alice" }]}
        groups={[]}
        isAdding={false}
        onAdd={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Share" })).toBeDisabled();
  });

  it("renders the combobox helper text and role picker", () => {
    render(
      <ShareAddPrincipalRow
        members={[{ value: "u-1", label: "Alice" }]}
        groups={[{ value: "g-1", label: "Analytics" }]}
        isAdding={false}
        onAdd={vi.fn()}
      />,
    );

    // The combobox is keyboard-reachable and labelled. Mantine renders
    // both the input and the listbox with the same aria-label, so we
    // assert via the input's role explicitly.
    const comboboxes = screen.getAllByRole("combobox");
    expect(
      comboboxes.some((el) => {
        return el.getAttribute("aria-label") === "Add people or user groups";
      }),
    ).toBe(true);

    // The role picker is labelled.
    expect(
      comboboxes.some((el) => {
        return el.getAttribute("aria-label") === "Role for new share";
      }),
    ).toBe(true);
  });

  it("shows the loading state on the Share button while adding", () => {
    render(
      <ShareAddPrincipalRow
        members={[{ value: "u-1", label: "Alice" }]}
        groups={[]}
        isAdding
        onAdd={vi.fn()}
      />,
    );
    // Mantine sets `data-loading` on the button when `loading` is true.
    const btn = screen.getByRole("button", { name: "Share" });
    expect(btn).toHaveAttribute("data-loading", "true");
  });
});
