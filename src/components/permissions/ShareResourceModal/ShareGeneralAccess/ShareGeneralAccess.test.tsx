import { afterEach, describe, expect, it, vi } from "vitest";

import { NuxStepFactsStore } from "@/components/Nux/NuxTour/NuxStepFactsStore/NuxStepFactsStore";
import { ShareGeneralAccess } from "@/components/permissions/ShareResourceModal/ShareGeneralAccess/ShareGeneralAccess";
import { render, screen } from "@/test-utils";

function findComboboxByAriaLabel(label: string): HTMLElement | undefined {
  return screen.getAllByRole("combobox").find((el) => {
    return el.getAttribute("aria-label") === label;
  });
}

// Nothing here opens the dropdown: a Mantine `Select` dropdown cannot be
// opened in jsdom, so which options exist and which are disabled are asserted
// in `GeneralAccess.test.ts` (the pure module) and end to end in a real
// browser instead.
describe("ShareGeneralAccess", () => {
  afterEach(() => {
    NuxStepFactsStore.setGeneralAccessIsWorkspace(false);
  });
  it("hides the workspace-role picker when restricted", () => {
    render(
      <ShareGeneralAccess
        resourceType="dataset"
        value="restricted"
        isOwner
        isBusy={false}
        workspaceShareRole={null}
        isPublicOptionAvailable={false}
        publicOptionDisabledReason={undefined}
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
        isPublicOptionAvailable={false}
        publicOptionDisabledReason={undefined}
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
        isPublicOptionAvailable={false}
        publicOptionDisabledReason={undefined}
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
        isPublicOptionAvailable={false}
        publicOptionDisabledReason={undefined}
        onChange={vi.fn()}
        onWorkspaceRoleChange={vi.fn()}
      />,
    );
    const generalCombobox = findComboboxByAriaLabel("General access");
    expect(generalCombobox).toBeDefined();
    expect(generalCombobox).toHaveValue("Anyone in Dashboards");
  });

  it("tells the tutorial when a dashboard is already shared with the workspace", () => {
    render(
      <ShareGeneralAccess
        resourceType="dashboard"
        value="workspace"
        isOwner
        isBusy={false}
        workspaceShareRole="viewer"
        isPublicOptionAvailable={false}
        publicOptionDisabledReason={undefined}
        onChange={vi.fn()}
        onWorkspaceRoleChange={vi.fn()}
      />,
    );
    expect(NuxStepFactsStore.getGeneralAccessIsWorkspace()).toBe(true);
  });

  it("selects Only me when the value is private", () => {
    render(
      <ShareGeneralAccess
        resourceType="dataset"
        value="private"
        isOwner
        isBusy={false}
        workspaceShareRole={null}
        isPublicOptionAvailable={false}
        publicOptionDisabledReason={undefined}
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
        isPublicOptionAvailable={false}
        publicOptionDisabledReason={undefined}
        onChange={vi.fn()}
        onWorkspaceRoleChange={vi.fn()}
      />,
    );
    expect(findComboboxByAriaLabel("General access")).toBeDisabled();
  });

  it("selects Anyone with the link when the value is public", () => {
    render(
      <ShareGeneralAccess
        resourceType="dashboard"
        value="public"
        isOwner
        isBusy={false}
        workspaceShareRole={null}
        isPublicOptionAvailable
        publicOptionDisabledReason={undefined}
        onChange={vi.fn()}
        onWorkspaceRoleChange={vi.fn()}
      />,
    );
    expect(findComboboxByAriaLabel("General access")).toHaveValue(
      "Anyone with the link",
    );
  });

  it("keeps the workspace-role picker hidden for the public value", () => {
    // The role picker configures the workspace share row, which "Anyone with
    // the link" does not write. Rendering it would imply public viewers get a
    // role, and they get no row at all.
    render(
      <ShareGeneralAccess
        resourceType="dashboard"
        value="public"
        isOwner
        isBusy={false}
        workspaceShareRole="viewer"
        isPublicOptionAvailable
        publicOptionDisabledReason={undefined}
        onChange={vi.fn()}
        onWorkspaceRoleChange={vi.fn()}
      />,
    );
    expect(
      findComboboxByAriaLabel("Role for everyone in the workspace"),
    ).toBeUndefined();
  });

  it("explains why the public option is unavailable", () => {
    render(
      <ShareGeneralAccess
        resourceType="dashboard"
        value="restricted"
        isOwner
        isBusy={false}
        workspaceShareRole={null}
        isPublicOptionAvailable
        publicOptionDisabledReason="Only workspace admins can publish to the web."
        onChange={vi.fn()}
        onWorkspaceRoleChange={vi.fn()}
      />,
    );
    expect(
      screen.getByText("Only workspace admins can publish to the web."),
    ).toBeInTheDocument();
  });

  it("does not render the reason when the public option is unavailable", () => {
    // Reaching this state (a reason with no available option) should not
    // happen in practice, but nothing in the types prevents it, so the
    // reason must stay hidden if it does.
    render(
      <ShareGeneralAccess
        resourceType="dashboard"
        value="restricted"
        isOwner
        isBusy={false}
        workspaceShareRole={null}
        isPublicOptionAvailable={false}
        publicOptionDisabledReason="Only workspace admins can publish to the web."
        onChange={vi.fn()}
        onWorkspaceRoleChange={vi.fn()}
      />,
    );
    expect(
      screen.queryByText("Only workspace admins can publish to the web."),
    ).not.toBeInTheDocument();
  });
});
