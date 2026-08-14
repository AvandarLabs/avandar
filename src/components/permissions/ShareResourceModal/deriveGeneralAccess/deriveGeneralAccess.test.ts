import { describe, expect, it } from "vitest";
import {
  buildGeneralAccessOptions,
  deriveGeneralAccessValue,
  hasNonOwnerShare,
} from "./deriveGeneralAccess";
import type { ResourceShareRow } from "@/clients/permissions/ResourceShareClient";
import type { WorkspaceId } from "$/models/Workspace/Workspace.types";

const OWNER_ID = "owner-1";

const LABELS = {
  private: "Only me",
  restricted: "Restricted",
  workspace: "Anyone in Dashboards",
};

function share(
  overrides: Partial<ResourceShareRow> &
    Pick<ResourceShareRow, "principalType">,
): ResourceShareRow {
  return {
    id: "share-1",
    workspaceId: "ws-1" as WorkspaceId,
    resourceType: "dashboard",
    resourceId: "res-1",
    principalId: null,
    role: "viewer",
    requiresAppAccess: false,
    ...overrides,
  };
}

describe("hasNonOwnerShare", () => {
  it("is false with no shares", () => {
    expect(hasNonOwnerShare({ shares: [], ownerId: OWNER_ID })).toBe(false);
  });

  it("is false for the owner's own user share", () => {
    expect(
      hasNonOwnerShare({
        shares: [share({ principalType: "user", principalId: OWNER_ID })],
        ownerId: OWNER_ID,
      }),
    ).toBe(false);
  });

  it("is true for a user share to someone else", () => {
    expect(
      hasNonOwnerShare({
        shares: [share({ principalType: "user", principalId: "other-1" })],
        ownerId: OWNER_ID,
      }),
    ).toBe(true);
  });

  it("is true for a group share", () => {
    expect(
      hasNonOwnerShare({
        shares: [
          share({ principalType: "user_group", principalId: "group-1" }),
        ],
        ownerId: OWNER_ID,
      }),
    ).toBe(true);
  });

  // The workspace principal carries a null principalId by convention. This is
  // the row a `filter(principalType === "user")` implementation drops, which
  // would report a workspace-shared resource as private.
  it("is true for a workspace share with a null principalId", () => {
    expect(
      hasNonOwnerShare({
        shares: [share({ principalType: "workspace", principalId: null })],
        ownerId: OWNER_ID,
      }),
    ).toBe(true);
  });
});

describe("deriveGeneralAccessValue", () => {
  it("is workspace when not restricted", () => {
    expect(
      deriveGeneralAccessValue({
        isRestricted: false,
        shares: [],
        ownerId: OWNER_ID,
      }),
    ).toBe("workspace");
  });

  it("is private when restricted with only the owner's own share", () => {
    expect(
      deriveGeneralAccessValue({
        isRestricted: true,
        shares: [share({ principalType: "user", principalId: OWNER_ID })],
        ownerId: OWNER_ID,
      }),
    ).toBe("private");
  });

  it("is restricted when restricted with a non-owner share", () => {
    expect(
      deriveGeneralAccessValue({
        isRestricted: true,
        shares: [share({ principalType: "user", principalId: "other-1" })],
        ownerId: OWNER_ID,
      }),
    ).toBe("restricted");
  });
});

describe("buildGeneralAccessOptions", () => {
  it("lists Only me first, then Restricted, then the workspace option", () => {
    const options = buildGeneralAccessOptions({
      isOwner: true,
      labels: LABELS,
    });
    expect(
      options.map((option) => {
        return option.value;
      }),
    ).toEqual(["private", "restricted", "workspace"]);
  });

  it("enables Only me for the owner", () => {
    const options = buildGeneralAccessOptions({
      isOwner: true,
      labels: LABELS,
    });
    expect(options[0]?.disabled).toBe(false);
  });

  it("disables Only me for a non-owner", () => {
    const options = buildGeneralAccessOptions({
      isOwner: false,
      labels: LABELS,
    });
    expect(options[0]?.disabled).toBe(true);
  });

  it("never disables the other two options", () => {
    const options = buildGeneralAccessOptions({
      isOwner: false,
      labels: LABELS,
    });
    expect(options[1]?.disabled).toBe(false);
    expect(options[2]?.disabled).toBe(false);
  });
});
