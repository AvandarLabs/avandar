import { notifyWarning } from "@ui";
import { registerSW } from "virtual:pwa-register";

export function registerOfflineServiceWorker(): void {
  if (import.meta.env.DEV) {
    return;
  }

  registerSW({
    immediate: true,
    onNeedRefresh() {
      notifyWarning({
        title: "Update available",
        message: "A new version is available. Refresh to update.",
      });
    },
  });
}
