import { describe, expect, it } from "vitest";
import { makePrivateConfirmCopy } from "@/components/permissions/ShareResourceModal/copy/makePrivateConfirmCopy";

describe("makePrivateConfirmCopy", () => {
  it("warns that a public dashboard stays readable until it is unpublished", () => {
    const copy = makePrivateConfirmCopy({
      resourceName: "Q3 Revenue",
      app: "Dashboards",
      numUsers: 2,
      numGroups: 0,
      losesWorkspaceAccess: true,
      isPubliclyPublished: true,
    });
    expect(JSON.stringify(copy)).toContain("still be public");
  });

  it("says nothing about publication for an unpublished resource", () => {
    const copy = makePrivateConfirmCopy({
      resourceName: "Q3 Revenue",
      app: "Dashboards",
      numUsers: 2,
      numGroups: 0,
      losesWorkspaceAccess: true,
      isPubliclyPublished: false,
    });
    expect(JSON.stringify(copy)).not.toContain("still be public");
  });
});
