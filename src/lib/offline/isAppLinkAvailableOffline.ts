import type { AppLink } from "@/config/AppLinks";

/**
 * Whether a navbar (or similar) app link can be used while offline.
 * Read-only demo surfaces stay reachable; network-backed apps are gated.
 */
export function isAppLinkAvailableOffline(link: AppLink): boolean {
  const key = String(link.key);

  if (
    key === "workspace-home" ||
    key === "data-explorer" ||
    key === "dashboards" ||
    key === "dataImport" ||
    key === "data-manager" ||
    key === "workspace-settings"
  ) {
    return true;
  }

  if (key.startsWith("data-manager-")) {
    return true;
  }

  if (key === "map" || key === "shared-with-me") {
    return false;
  }

  if (
    key.startsWith("entity-config-") ||
    key.startsWith("entity-manager-") ||
    key === "entity-designer" ||
    key === "entity-creator"
  ) {
    return false;
  }

  return false;
}
