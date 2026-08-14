import { describe, expect, it, vi } from "vitest";
import { ShareGeneralAccess } from "@/components/permissions/ShareResourceModal/ShareGeneralAccess/ShareGeneralAccess";
import { render, screen } from "@/test-utils";

function findComboboxByAriaLabel(label: string): HTMLElement | undefined {
  return screen.getAllByRole("combobox").find((el) => {
    return el.getAttribute("aria-label") === label;
  });
}

// Nothing here opens the dropdown: a Mantine `Select` dropdown cannot be
// opened in jsdom, so which options exist and which are disabled are asserted
// in `deriveGeneralAccess.test.ts` (the pure builder) and end to end in a real
// browser instead.
describe("ShareGeneralAccess", () => {
  it("hides the workspace-role picker when restricted", () => {
    render(
      <ShareGeneralAccess
        resourceType="dataset"
        value="restricted"
        isOwner
        isBusy={false}
        workspaceShareRole={null}
        onChange={vi.fn()}
        onWorkspaceRoleChange={vi.fn()}
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
        value="workspace"
        isOwner
        isBusy={false}
        workspaceShareRole="viewer"
        onChange={vi.fn()}
        onWorkspaceRoleChange={vi.fn()}
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
        value="workspace"
        isOwner
        isBusy={false}
        workspaceShareRole="viewer"
        onChange={vi.fn()}
        onWorkspaceRoleChange={vi.fn()}
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
        value="workspace"
        isOwner
        isBusy={false}
        workspaceShareRole="viewer"
        onChange={vi.fn()}
        onWorkspaceRoleChange={vi.fn()}
      />,
    );
    const generalCombobox = findComboboxByAriaLabel("General access");
    expect(generalCombobox).toBeDefined();
    expect(generalCombobox).toHaveValue("Anyone in Dashboards");
  });

  it("selects Only me when the value is private", () => {
    render(
      <ShareGeneralAccess
        resourceType="dataset"
        value="private"
        isOwner
        isBusy={false}
        workspaceShareRole={null}
        onChange={vi.fn()}
        onWorkspaceRoleChange={vi.fn()}
      />,
    );
    expect(findComboboxByAriaLabel("General access")).toHaveValue("Only me");
    // Private is a restricted state, so the workspace-role picker stays hidden.
    expect(
      findComboboxByAriaLabel("Role for everyone in the workspace"),
    ).toBeUndefined();
  });

  it("disables the dropdown while the mutation is in flight", () => {
    render(
      <ShareGeneralAccess
        resourceType="dataset"
        value="restricted"
        isOwner
        isBusy
        workspaceShareRole={null}
        onChange={vi.fn()}
        onWorkspaceRoleChange={vi.fn()}
      />,
    );
    expect(findComboboxByAriaLabel("General access")).toBeDisabled();
  });
});
