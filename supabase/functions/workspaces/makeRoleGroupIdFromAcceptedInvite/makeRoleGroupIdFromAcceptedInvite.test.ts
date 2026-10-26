import { WorkspaceInviteRoleOverrideSchema } from "@sbfn/workspaces/makeRoleGroupIdFromAcceptedInvite/makeRoleGroupIdFromAcceptedInvite.ts";
import { describe, expect, it } from "vitest";

describe("WorkspaceInviteRoleOverrideSchema", () => {
  it("accepts GIS role overrides", () => {
    expect(
      WorkspaceInviteRoleOverrideSchema.safeParse({
        app: "gis",
        role: "editor",
      }).success,
    ).toBe(true);
  });

  it("accepts role overrides for both case apps", () => {
    expect(
      WorkspaceInviteRoleOverrideSchema.safeParse({
        app: "case_types",
        role: "editor",
      }).success,
    ).toBe(true);
    expect(
      WorkspaceInviteRoleOverrideSchema.safeParse({
        app: "case_records",
        role: "admin",
      }).success,
    ).toBe(true);
  });
});
