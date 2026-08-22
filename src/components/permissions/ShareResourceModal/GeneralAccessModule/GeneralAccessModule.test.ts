import type { Workspace } from "$/models/Workspace/Workspace";
import type { ResourceShareRow } from "@/clients/permissions/ResourceShareClient";

import { prop } from "@avandar/utils";
import { describe, expect, it } from "vitest";

import { GeneralAccessModule } from "./GeneralAccessModule";

const OWNER_ID = "owner-1";

const LABELS = {
  private: "Only me",
  restricted: "Restricted",
  workspace: "Anyone in Dashboards",
  public: "Anyone with the link",
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
      GeneralAccessModule.doesNonOwnerHaveAccess({
        shares: [],
        ownerId: OWNER_ID,
      }),
    ).toBe(false);
  });

  it("is false for the owner's own user share", () => {
    expect(
      GeneralAccessModule.doesNonOwnerHaveAccess({
        shares: [_buildShare({ principalType: "user", principalId: OWNER_ID })],
        ownerId: OWNER_ID,
      }),
    ).toBe(false);
  });

  it("is true for a user share to someone else", () => {
    expect(
      GeneralAccessModule.doesNonOwnerHaveAccess({
        shares: [
          _buildShare({ principalType: "user", principalId: "other-1" }),
        ],
        ownerId: OWNER_ID,
      }),
    ).toBe(true);
  });

  it("is true for a group share", () => {
    expect(
      GeneralAccessModule.doesNonOwnerHaveAccess({
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
      GeneralAccessModule.doesNonOwnerHaveAccess({
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
      GeneralAccessModule.fromShareState({
        isRestricted: false,
        shares: [],
        ownerId: OWNER_ID,
      }),
    ).toBe("workspace");
  });

  it("is private when restricted with only the owner's own share", () => {
    expect(
      GeneralAccessModule.fromShareState({
        isRestricted: true,
        shares: [_buildShare({ principalType: "user", principalId: OWNER_ID })],
        ownerId: OWNER_ID,
      }),
    ).toBe("private");
  });

  it("is restricted when restricted with a non-owner share", () => {
    expect(
      GeneralAccessModule.fromShareState({
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
    const options = GeneralAccessModule.makeDropdownOptionsFromLabels({
      isOwner: true,
      labels: LABELS,
      isPublicOptionAvailable: true,
      isPublicOptionDisabled: false,
    });
    expect(options.map(prop("value"))).toEqual(GeneralAccessModule.values);
  });

  it("enables Only me for the owner", () => {
    const options = GeneralAccessModule.makeDropdownOptionsFromLabels({
      isOwner: true,
      labels: LABELS,
      isPublicOptionAvailable: false,
      isPublicOptionDisabled: false,
    });
    expect(options[0]?.disabled).toBe(false);
  });

  it("disables Only me for a non-owner", () => {
    const options = GeneralAccessModule.makeDropdownOptionsFromLabels({
      isOwner: false,
      labels: LABELS,
      isPublicOptionAvailable: false,
      isPublicOptionDisabled: false,
    });
    expect(options[0]?.disabled).toBe(true);
  });

  it("never disables the other two options", () => {
    const options = GeneralAccessModule.makeDropdownOptionsFromLabels({
      isOwner: false,
      labels: LABELS,
      isPublicOptionAvailable: false,
      isPublicOptionDisabled: false,
    });
    expect(options[1]?.disabled).toBe(false);
    expect(options[2]?.disabled).toBe(false);
  });
});

describe("GeneralAccess.isValid", () => {
  it("accepts every supported value", () => {
    expect(
      GeneralAccessModule.values.every(GeneralAccessModule.isValidAccessValue),
    ).toBe(true);
  });

  it("rejects unsupported values", () => {
    expect(GeneralAccessModule.isValidAccessValue("organization")).toBe(false);
  });
});

describe("fromResourceState", () => {
  const ownerId = "user-1";
  const restrictedNoShares = {
    isRestricted: true,
    shares: [],
    ownerId,
  };

  it("returns public when the pending selection is public, whatever the shares say", () => {
    expect(
      GeneralAccessModule.fromResourceState({
        ...restrictedNoShares,
        isPublicSelected: true,
      }),
    ).toBe("public");
  });

  it("falls back to the share-derived value when public is not selected", () => {
    expect(
      GeneralAccessModule.fromResourceState({
        ...restrictedNoShares,
        isPublicSelected: false,
      }),
    ).toBe("private");
  });
});

describe("makeDropdownOptionsFromLabels", () => {
  const labels = {
    private: "Only me",
    restricted: "Restricted",
    workspace: "Anyone in Dashboards",
    public: "Anyone with the link",
  };

  it("omits the public option when the resource has no published form", () => {
    const options = GeneralAccessModule.makeDropdownOptionsFromLabels({
      isOwner: true,
      labels,
      isPublicOptionAvailable: false,
      isPublicOptionDisabled: false,
    });
    expect(
      options.map((option) => {
        return option.value;
      }),
    ).toEqual(["private", "restricted", "workspace"]);
  });

  it("renders the public option disabled when the caller cannot publish publicly", () => {
    const options = GeneralAccessModule.makeDropdownOptionsFromLabels({
      isOwner: true,
      labels,
      isPublicOptionAvailable: true,
      isPublicOptionDisabled: true,
    });
    expect(options.at(-1)).toEqual({
      value: "public",
      label: "Anyone with the link",
      disabled: true,
    });
  });
});
