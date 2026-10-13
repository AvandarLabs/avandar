import { t } from "@lingui/core/macro";
import { notifications } from "@mantine/notifications";
import { noop } from "@avandar/utils";
import { createElement } from "react";
import { registerSW } from "virtual:pwa-register";
import { ServiceWorkerUpdateNotification } from "@/lib/offline/registerOfflineServiceWorker/ServiceWorkerUpdateNotification/ServiceWorkerUpdateNotification";

const UPDATE_CHECK_INTERVAL_MS = 30 * 60 * 1000;
const UPDATE_NOTIFICATION_ID = "service-worker-update-available";

/**
 * Reloads the page once `waitingWorker` finishes activating, rather than as
 * soon as skipWaiting is requested. Workbox's generated service worker still
 * runs its activate step (cache cleanup) after `skipWaiting()`, so reloading
 * earlier can hand the fresh page back to the still-active old worker.
 */
function _reloadOnceActivated(waitingWorker: ServiceWorker): void {
  if (waitingWorker.state === "activated") {
    window.location.reload();
    return;
  }

  waitingWorker.addEventListener("statechange", () => {
    if (waitingWorker.state === "activated") {
      window.location.reload();
    }
  });
}

type UpdateNotificationOptions = {
  registration: ServiceWorkerRegistration;
  updateServiceWorker: () => Promise<void>;
};

/**
 * Shows the "update available" notification, or re-surfaces it if the user
 * dismissed it earlier: Mantine no-ops a `show()` for an id already on
 * screen, so this is safe to call repeatedly while one waiting worker is
 * still pending, and shows it again once that worker is gone from the
 * screen (dismissed) but still `registration.waiting`.
 */
function _showUpdateNotification(
  options: Readonly<UpdateNotificationOptions>,
): void {
  notifications.show({
    id: UPDATE_NOTIFICATION_ID,
    title: t`Update available`,
    autoClose: false,
    withCloseButton: true,
    message: createElement(ServiceWorkerUpdateNotification, {
      onUpdate: () => {
        const waitingWorker = options.registration.waiting;
        if (waitingWorker) {
          _reloadOnceActivated(waitingWorker);
        }
        void options.updateServiceWorker();
      },
    }),
  });
}

/**
 * Checks for a new deployed version on an interval and whenever the tab
 * regains focus, so an open tab notices a release without needing a manual
 * reload to trigger the browser's own (much less frequent) check. Each check
 * also re-shows the update notification if one is still pending: closing the
 * notification only dismisses it, it does not cancel the update, so a tab
 * left open keeps getting reminded instead of sitting on stale code forever.
 *
 * A tab-focus event only triggers a check if a full interval has passed
 * since the last one. Without this, switching away and back to the tab
 * (common when someone is mid-task elsewhere) would re-show a just-dismissed
 * notification immediately, which is more interruption than an open update
 * warrants.
 */
function _pollForUpdates(options: Readonly<UpdateNotificationOptions>): void {
  let lastCheckedAt = Date.now();

  const _checkNow = () => {
    lastCheckedAt = Date.now();
    // A failed check (offline, flaky network) just retries on the next tick
    // or the next tab focus; nothing to surface to the user.
    options.registration.update().catch(noop);
    if (options.registration.waiting) {
      _showUpdateNotification(options);
    }
  };

  setInterval(_checkNow, UPDATE_CHECK_INTERVAL_MS);
  document.addEventListener("visibilitychange", () => {
    const hasIntervalElapsed =
      Date.now() - lastCheckedAt >= UPDATE_CHECK_INTERVAL_MS;
    if (document.visibilityState === "visible" && hasIntervalElapsed) {
      _checkNow();
    }
  });
}

/**
 * Registers the PWA service worker in production builds and shows a
 * dismissible notification once a new deployed version is ready, repeating
 * it periodically until the user accepts. Accepting it reloads only the tab
 * that accepted; every other open tab keeps running its current session
 * undisturbed. No-op in dev mode.
 */
export function registerOfflineServiceWorker(): void {
  if (import.meta.env.DEV) {
    return;
  }

  let registration: ServiceWorkerRegistration | undefined;

  const updateServiceWorker = registerSW({
    immediate: true,
    onRegisteredSW(_swScriptUrl, swRegistration) {
      registration = swRegistration;
      if (registration) {
        _pollForUpdates({ registration, updateServiceWorker });
      }
    },
    onNeedRefresh() {
      if (registration) {
        _showUpdateNotification({ registration, updateServiceWorker });
      }
    },
  });
}
