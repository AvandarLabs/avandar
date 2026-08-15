import { describe, expect, it } from "vitest";
import { DashboardPublishingModule } from "@/views/DashboardApp/DashboardShareModal/DashboardPublishingModule/DashboardPublishingModule";

describe("targetVisibilityFor", () => {
  it("maps Only me to draft, because a published copy for an audience of one is pure cost", () => {
    expect(DashboardPublishingModule.targetVisibilityFor("private")).toBe(
      "draft",
    );
  });

  it("maps Restricted to workspace, which is the internal-report shape", () => {
    expect(DashboardPublishingModule.targetVisibilityFor("restricted")).toBe(
      "workspace",
    );
  });

  it("maps the workspace-wide value to workspace", () => {
    expect(DashboardPublishingModule.targetVisibilityFor("workspace")).toBe(
      "workspace",
    );
  });

  it("maps Anyone with the link to public", () => {
    expect(DashboardPublishingModule.targetVisibilityFor("public")).toBe(
      "public",
    );
  });
});

describe("getPublishActionKind", () => {
  const cases = [
    { visibility: "draft", target: "draft", expected: "disabled_no_audience" },
    { visibility: "draft", target: "workspace", expected: "publish_workspace" },
    { visibility: "draft", target: "public", expected: "publish_public" },
    { visibility: "workspace", target: "draft", expected: "unpublish" },
    { visibility: "workspace", target: "workspace", expected: "republish" },
    { visibility: "workspace", target: "public", expected: "publish_public" },
    { visibility: "public", target: "draft", expected: "unpublish" },
    { visibility: "public", target: "workspace", expected: "make_internal" },
    { visibility: "public", target: "public", expected: "republish" },
  ] as const;

  it.each(cases)(
    "$visibility -> $target is $expected",
    ({ visibility, target, expected }) => {
      expect(
        DashboardPublishingModule.getPublishActionKind({
          visibility,
          targetVisibility: target,
        }),
      ).toBe(expected);
    },
  );
});
