import { WorkspaceInviteRoleOverrideSchema } from "@sbfn/workspaces/inviteRoleResolution.ts";
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
});
