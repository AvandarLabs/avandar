import type { AppLink } from "@/config/AppLinks";

/**
 * Whether a navbar (or similar) app link can be used while offline.
 * Read-only demo surfaces stay reachable; network-backed apps are gated.
 */
export function isAppLinkAvailableOffline(link: AppLink): boolean {
  const key = String(link.key);

  return (
    key === "workspace-home" ||
    key === "data-explorer" ||
    key === "dashboards" ||
    key === "dataImport" ||
    key === "data-manager" ||
    key === "workspace-settings" ||
    key.startsWith("data-manager-")
  );
}
