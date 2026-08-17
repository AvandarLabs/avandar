import { describe, expect, it } from "vitest";
import { AppLinks } from "@/config/AppLinks/AppLinks";
import { isAppLinkAvailableOffline } from "@/lib/offline/isAppLinkAvailableOffline/isAppLinkAvailableOffline";

describe("isAppLinkAvailableOffline", () => {
  it("allows core read-only workspace apps", () => {
    expect(isAppLinkAvailableOffline(AppLinks.workspaceHome("ws"))).toBe(true);
    expect(isAppLinkAvailableOffline(AppLinks.dataExplorer("ws"))).toBe(true);
    expect(isAppLinkAvailableOffline(AppLinks.dashboards("ws"))).toBe(true);
    expect(isAppLinkAvailableOffline(AppLinks.dataImport("ws"))).toBe(true);
    expect(isAppLinkAvailableOffline(AppLinks.workspaceSettings("ws"))).toBe(
      true,
    );
  });

  it("blocks network-backed apps", () => {
    expect(isAppLinkAvailableOffline(AppLinks.map("ws"))).toBe(false);
    expect(isAppLinkAvailableOffline(AppLinks.ontologyDesignerHome("ws"))).toBe(
      false,
    );
    expect(
      isAppLinkAvailableOffline(
        AppLinks.individualManagerHome({
          workspaceSlug: "ws",
          conceptId: "ec-1",
          conceptName: "Profiles",
        }),
      ),
    ).toBe(false);
  });
});
