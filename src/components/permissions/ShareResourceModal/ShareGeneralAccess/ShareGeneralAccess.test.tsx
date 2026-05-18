import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ShareGeneralAccess } from "@/components/permissions/ShareResourceModal/ShareGeneralAccess/ShareGeneralAccess";
import { render } from "@/utils/testing-utils";

function findComboboxByAriaLabel(label: string): HTMLElement | undefined {
  return screen.getAllByRole("combobox").find((el) => {
    return el.getAttribute("aria-label") === label;
  });
}

describe("ShareGeneralAccess", () => {
  it("hides the workspace-role picker when restricted", () => {
    render(
      <ShareGeneralAccess
        resourceType="dataset"
        isRestricted
        workspaceShareRole={null}
        onChange={vi.fn()}
      />,
    );
    // Only the general-access combobox is rendered.
    const comboboxes = screen.getAllByRole("combobox");
    expect(comboboxes).toHaveLength(1);
    expect(comboboxes[0]?.getAttribute("aria-label")).toBe("General access");
    // The workspace-role picker is not rendered when restricted.
    expect(
      findComboboxByAriaLabel("Role for everyone in the workspace"),
    ).toBeUndefined();
  });

  it("shows the workspace-role picker when not restricted", () => {
    render(
      <ShareGeneralAccess
        resourceType="dataset"
        isRestricted={false}
        workspaceShareRole="viewer"
        onChange={vi.fn()}
      />,
    );
    expect(
      findComboboxByAriaLabel("Role for everyone in the workspace"),
    ).toBeDefined();
  });

  it("renders the {AppLabel}-aware option for datasets", () => {
    render(
      <ShareGeneralAccess
        resourceType="dataset"
        isRestricted={false}
        workspaceShareRole="viewer"
        onChange={vi.fn()}
      />,
    );
    // Mantine renders the selected option's label inside the input;
    // for datasets, it should be "Anyone in Data Sources".
    const generalCombobox = findComboboxByAriaLabel("General access");
    expect(generalCombobox).toBeDefined();
    expect(generalCombobox).toHaveValue("Anyone in Data Sources");
  });

  it("renders the {AppLabel}-aware option for dashboards", () => {
    render(
      <ShareGeneralAccess
        resourceType="dashboard"
        isRestricted={false}
        workspaceShareRole="viewer"
        onChange={vi.fn()}
      />,
    );
    const generalCombobox = findComboboxByAriaLabel("General access");
    expect(generalCombobox).toBeDefined();
    expect(generalCombobox).toHaveValue("Anyone in Dashboards");
  });
});
