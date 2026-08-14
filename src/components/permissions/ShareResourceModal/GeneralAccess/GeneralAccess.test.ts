import { prop } from "@avandar/utils";
import { describe, expect, it } from "vitest";
import { GeneralAccess } from "./GeneralAccess";
import type { ResourceShareRow } from "@/clients/permissions/ResourceShareClient";
import type { Workspace } from "$/models/Workspace/Workspace";

const OWNER_ID = "owner-1";

const LABELS = {
  private: "Only me",
  restricted: "Restricted",
  workspace: "Anyone in Dashboards",
} as const;

function _buildShare(
  overrides: Partial<ResourceShareRow> &
    Pick<ResourceShareRow, "principalType">,
): ResourceShareRow {
  return {
    id: "share-1",
    workspaceId: "ws-1" as Workspace.Id,
    resourceType: "dashboard",
    resourceId: "res-1",
    principalId: null,
    role: "viewer",
    requiresAppAccess: false,
    ...overrides,
  };
}

describe("GeneralAccess.hasNonOwnerShare", () => {
  it("is false with no shares", () => {
    expect(
      GeneralAccess.hasNonOwnerShare({ shares: [], ownerId: OWNER_ID }),
    ).toBe(false);
  });

  it("is false for the owner's own user share", () => {
    expect(
      GeneralAccess.hasNonOwnerShare({
        shares: [_buildShare({ principalType: "user", principalId: OWNER_ID })],
        ownerId: OWNER_ID,
      }),
    ).toBe(false);
  });

  it("is true for a user share to someone else", () => {
    expect(
      GeneralAccess.hasNonOwnerShare({
        shares: [
          _buildShare({ principalType: "user", principalId: "other-1" }),
        ],
        ownerId: OWNER_ID,
      }),
    ).toBe(true);
  });

  it("is true for a group share", () => {
    expect(
      GeneralAccess.hasNonOwnerShare({
        shares: [
          _buildShare({
            principalType: "user_group",
            principalId: "group-1",
          }),
        ],
        ownerId: OWNER_ID,
      }),
    ).toBe(true);
  });

  it("is true for a workspace share with a null principalId", () => {
    expect(
      GeneralAccess.hasNonOwnerShare({
        shares: [
          _buildShare({ principalType: "workspace", principalId: null }),
        ],
        ownerId: OWNER_ID,
      }),
    ).toBe(true);
  });
});

describe("GeneralAccess.fromSharingState", () => {
  it("is workspace when not restricted", () => {
    expect(
      GeneralAccess.fromSharingState({
        isRestricted: false,
        shares: [],
        ownerId: OWNER_ID,
      }),
    ).toBe("workspace");
  });

  it("is private when restricted with only the owner's own share", () => {
    expect(
      GeneralAccess.fromSharingState({
        isRestricted: true,
        shares: [_buildShare({ principalType: "user", principalId: OWNER_ID })],
        ownerId: OWNER_ID,
      }),
    ).toBe("private");
  });

  it("is restricted when restricted with a non-owner share", () => {
    expect(
      GeneralAccess.fromSharingState({
        isRestricted: true,
        shares: [
          _buildShare({ principalType: "user", principalId: "other-1" }),
        ],
        ownerId: OWNER_ID,
      }),
    ).toBe("restricted");
  });
});

describe("GeneralAccess.toOptions", () => {
  it("lists the values in display order", () => {
    const options = GeneralAccess.toOptions({
      isOwner: true,
      labels: LABELS,
    });
    expect(options.map(prop("value"))).toEqual(GeneralAccess.values);
  });

  it("enables Only me for the owner", () => {
    const options = GeneralAccess.toOptions({
      isOwner: true,
      labels: LABELS,
    });
    expect(options[0]?.disabled).toBe(false);
  });

  it("disables Only me for a non-owner", () => {
    const options = GeneralAccess.toOptions({
      isOwner: false,
      labels: LABELS,
    });
    expect(options[0]?.disabled).toBe(true);
  });

  it("never disables the other two options", () => {
    const options = GeneralAccess.toOptions({
      isOwner: false,
      labels: LABELS,
    });
    expect(options[1]?.disabled).toBe(false);
    expect(options[2]?.disabled).toBe(false);
  });
});

describe("GeneralAccess.isValid", () => {
  it("accepts every supported value", () => {
    expect(GeneralAccess.values.every(GeneralAccess.isValid)).toBe(true);
  });

  it("rejects unsupported values", () => {
    expect(GeneralAccess.isValid("organization")).toBe(false);
  });
});
