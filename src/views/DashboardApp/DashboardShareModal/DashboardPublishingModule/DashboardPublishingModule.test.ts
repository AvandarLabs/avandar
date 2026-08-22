import { describe, expect, it } from "vitest";
import { DashboardPublishingModule } from "@/views/DashboardApp/DashboardShareModal/DashboardPublishingModule/DashboardPublishingModule";

describe("getTargetVisibilityFromGeneralAccessValue", () => {
  it("maps Only me to draft, because a published copy for an audience of one is pure cost", () => {
    expect(
      DashboardPublishingModule.getTargetVisibilityFromGeneralAccessValue(
        "private",
      ),
    ).toBe("draft");
  });

  it("maps Restricted to workspace, which is the internal-report shape", () => {
    expect(
      DashboardPublishingModule.getTargetVisibilityFromGeneralAccessValue(
        "restricted",
      ),
    ).toBe("workspace");
  });

  it("maps the workspace-wide value to workspace", () => {
    expect(
      DashboardPublishingModule.getTargetVisibilityFromGeneralAccessValue(
        "workspace",
      ),
    ).toBe("workspace");
  });

  it("maps Anyone with the link to public", () => {
    expect(
      DashboardPublishingModule.getTargetVisibilityFromGeneralAccessValue(
        "public",
      ),
    ).toBe("public");
  });
});

describe("getInitialTargetVisibility", () => {
  it("opens a published dashboard on its persisted visibility", () => {
    expect(
      DashboardPublishingModule.getInitialTargetVisibility({
        visibility: "public",
        isRestricted: true,
      }),
    ).toBe("public");
  });

  it("opens an unrestricted draft ready to publish to the workspace", () => {
    expect(
      DashboardPublishingModule.getInitialTargetVisibility({
        visibility: "draft",
        isRestricted: false,
      }),
    ).toBe("workspace");
  });

  it("leaves a restricted draft unpublished until an audience is chosen", () => {
    expect(
      DashboardPublishingModule.getInitialTargetVisibility({
        visibility: "draft",
        isRestricted: true,
      }),
    ).toBe("draft");
  });
});

describe("getPublishActionKindFromVisibilities", () => {
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
        DashboardPublishingModule.getPublishActionKindFromVisibilities({
          visibility,
          targetVisibility: target,
        }),
      ).toBe(expected);
    },
  );
});
