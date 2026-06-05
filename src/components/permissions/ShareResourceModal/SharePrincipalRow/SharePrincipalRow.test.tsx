import { describe, expect, it, vi } from "vitest";
import { SharePrincipalRow } from "@/components/permissions/ShareResourceModal/SharePrincipalRow/SharePrincipalRow";
import { fireEvent, render, screen } from "@/test-utils";
import type { ResourceShareRow } from "@/clients/permissions/ResourceShareClient";
import type { WorkspaceId } from "$/models/Workspace/Workspace.types";

const baseShare: ResourceShareRow = {
  id: "s-1",
  workspaceId: "ws-1" as WorkspaceId,
  resourceType: "dataset",
  resourceId: "ds-1",
  principalType: "user",
  principalId: "p-1",
  role: "viewer",
  requiresAppAccess: false,
};

describe("SharePrincipalRow", () => {
  it("hides Limit to app access on user shares", () => {
    render(
      <SharePrincipalRow
        share={{ ...baseShare, principalType: "user" }}
        displayName="William Farr"
        resourceType="dataset"
        onRoleChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    expect(screen.queryByLabelText(/Limit .* to app access/)).toBeNull();
  });

  it("shows and toggles Limit to app access on user_group shares", () => {
    const onToggle = vi.fn();
    render(
      <SharePrincipalRow
        share={{ ...baseShare, principalType: "user_group" }}
        displayName="Analytics"
        resourceType="dataset"
        onRoleChange={vi.fn()}
        onToggleRequiresAppAccess={onToggle}
        onRemove={vi.fn()}
      />,
    );

    const checkbox = screen.getByLabelText("Limit Analytics to app access");
    fireEvent.click(checkbox);
    expect(onToggle).toHaveBeenCalledWith(true);
  });

  it("hides remove button and role select on owner row", () => {
    render(
      <SharePrincipalRow
        share={{ ...baseShare, principalType: "user" }}
        displayName="John Snow"
        resourceType="dataset"
        isOwnerRow
        onRoleChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    expect(
      screen.queryByRole("button", { name: /Remove access for John Snow/ }),
    ).toBeNull();
    expect(screen.getByText("Owner")).toBeInTheDocument();
    // Role select is replaced by the Owner badge.
    expect(screen.queryByLabelText(/Role for John Snow/)).toBeNull();
  });

  it("invokes onRemove when the remove button is clicked", () => {
    const onRemove = vi.fn();
    render(
      <SharePrincipalRow
        share={{ ...baseShare, principalType: "user" }}
        displayName="William Farr"
        resourceType="dataset"
        onRoleChange={vi.fn()}
        onRemove={onRemove}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: /Remove access for William Farr/ }),
    );
    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});
