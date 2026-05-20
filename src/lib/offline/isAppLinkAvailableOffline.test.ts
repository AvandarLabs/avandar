import { describe, expect, it } from "vitest";
import { AppLinks } from "@/config/AppLinks";
import { isAppLinkAvailableOffline } from "@/lib/offline/isAppLinkAvailableOffline";

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
    expect(isAppLinkAvailableOffline(AppLinks.sharedWithMe("ws"))).toBe(false);
    expect(isAppLinkAvailableOffline(AppLinks.entityDesignerHome("ws"))).toBe(
      false,
    );
    expect(
      isAppLinkAvailableOffline(
        AppLinks.entityManagerHome({
          workspaceSlug: "ws",
          entityConfigId: "ec-1",
          entityConfigName: "Profiles",
        }),
      ),
    ).toBe(false);
  });
});
