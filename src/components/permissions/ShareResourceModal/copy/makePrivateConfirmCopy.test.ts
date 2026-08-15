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

  it("names the resource rather than calling everything a dashboard", () => {
    // This module renders for datasets too, so the publication sentence has to
    // read like its siblings and interpolate what it is talking about.
    const copy = makePrivateConfirmCopy({
      resourceName: "California COVID",
      app: "Data Manager",
      numUsers: 0,
      numGroups: 1,
      losesWorkspaceAccess: false,
      isPubliclyPublished: true,
    });
    expect(copy.body).toContain("California COVID");
    expect(copy.body).not.toContain("dashboard");
  });
});
