import type { AppLink } from "@/config/AppLinks";

const OFFLINE_AVAILABLE_LINK_KEYS = new Set<string>([
  "workspace-home",
  "data-explorer",
  "dashboards",
  "dataImport",
  "data-manager",
  "workspace-settings",
]);

/**
 * Whether a navbar (or similar) app link can be used while offline.
 * Read-only demo surfaces stay reachable; network-backed apps are gated.
 */
export function isAppLinkAvailableOffline(link: AppLink): boolean {
  const key = String(link.key);

  if (OFFLINE_AVAILABLE_LINK_KEYS.has(key)) {
    return true;
  }

  return key.startsWith("data-manager-");
}
