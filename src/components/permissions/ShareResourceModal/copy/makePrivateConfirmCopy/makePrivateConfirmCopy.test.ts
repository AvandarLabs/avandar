import { describe, expect, it } from "vitest";
import { makePrivateConfirmCopy } from "@/components/permissions/ShareResourceModal/copy/makePrivateConfirmCopy/makePrivateConfirmCopy";

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

  // The unqualified "Only you will be able to open it" contradicts the public
  // warning, so a published resource must never be told it. Revoking shares
  // does not unpublish: everyone with the link keeps their access.
  it("never claims exclusive access for a public resource", () => {
    const copy = makePrivateConfirmCopy({
      resourceName: "Q3 Revenue",
      app: "Dashboards",
      numUsers: 2,
      numGroups: 0,
      losesWorkspaceAccess: true,
      isPubliclyPublished: true,
    });
    expect(copy.body).not.toContain("Only you will be able to open it");
    expect(copy.body).toContain(
      "Among signed-in people, only you will be able to open it",
    );
  });

  // ...and the true sentence has to come first, so the reader is not told
  // something false and then corrected by the next sentence.
  it("puts the public warning ahead of the exclusive-access sentence", () => {
    const copy = makePrivateConfirmCopy({
      resourceName: "Q3 Revenue",
      app: "Dashboards",
      numUsers: 2,
      numGroups: 0,
      losesWorkspaceAccess: true,
      isPubliclyPublished: true,
    });
    expect(copy.body.indexOf("still be public")).toBeLessThan(
      copy.body.indexOf("only you will be able to open it"),
    );
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
    expect(copy.body).toContain(
      "Only you will be able to open it. You can share it again at any time.",
    );
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
