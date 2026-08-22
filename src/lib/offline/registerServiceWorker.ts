import { t } from "@lingui/core/macro";
import { registerSW } from "virtual:pwa-register";

import { notifyWarning } from "@/utils/notifications/notify";

/**
 * Registers the PWA service worker in production builds and notifies the
 * user when a new version is ready to install. No-op in dev mode.
 */
export function registerOfflineServiceWorker(): void {
  if (import.meta.env.DEV) {
    return;
  }

  registerSW({
    immediate: true,
    onNeedRefresh() {
      notifyWarning({
        title: t`Update available`,
        message: t`A new version is available. Refresh to update.`,
      });
    },
  });
}
