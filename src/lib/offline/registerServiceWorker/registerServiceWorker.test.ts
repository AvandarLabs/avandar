import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { registerOfflineServiceWorker } from "@/lib/offline/registerServiceWorker/registerServiceWorker";
import { registerSW as registerSWMock } from "@/test-utils/virtualPwaRegisterStub";
import type { ReactElement } from "react";

const { notificationsShowMock } = vi.hoisted(() => {
  return { notificationsShowMock: vi.fn() };
});

vi.mock("@mantine/notifications", () => {
  return { notifications: { show: notificationsShowMock } };
});

type FakeWaitingWorker = ServiceWorker & { activate: () => void };

/** Minimal double for the subset of `ServiceWorker` this module reads. */
function _makeFakeWaitingWorker(): FakeWaitingWorker {
  const listeners: Array<() => void> = [];
  const worker = {
    state: "installed" as ServiceWorkerState,
    addEventListener: (_type: string, listener: EventListener) => {
      listeners.push(listener as () => void);
    },
    activate: () => {
      worker.state = "activated" as ServiceWorkerState;
      listeners.forEach((listener) => {
        listener();
      });
    },
  };
  return worker as unknown as FakeWaitingWorker;
}

/** Extracts the `onUpdate` callback passed into the rendered notification. */
function _getOnUpdateFromNotification(): () => void {
  const lastCall = notificationsShowMock.mock.calls.at(-1)?.[0] as {
    message: ReactElement<{ onUpdate: () => void }>;
  };
  return lastCall.message.props.onUpdate;
}

describe("registerOfflineServiceWorker", () => {
  let updateMock: ReturnType<typeof vi.fn>;
  let updateServiceWorkerMock: ReturnType<typeof vi.fn>;
  let reloadMock: ReturnType<typeof vi.fn>;
  let registration: ServiceWorkerRegistration;
  let onNeedRefresh: () => void;

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.stubEnv("DEV", false);

    updateMock = vi.fn().mockResolvedValue(undefined);
    updateServiceWorkerMock = vi.fn().mockResolvedValue(undefined);
    reloadMock = vi.fn();
    vi.stubGlobal("location", { ...window.location, reload: reloadMock });

    registerSWMock.mockReset();
    notificationsShowMock.mockReset();
    registerSWMock.mockImplementation(
      (options: {
        onRegisteredSW?: (
          url: string,
          reg: ServiceWorkerRegistration | undefined,
        ) => void;
        onNeedRefresh?: () => void;
      }) => {
        registration = {
          update: updateMock,
          waiting: undefined,
        } as unknown as ServiceWorkerRegistration;
        onNeedRefresh = options.onNeedRefresh ?? (() => {});
        // The real `registerSW` only calls `onRegisteredSW` after its own
        // `wb.register().then(...)` resolves, once the function has already
        // returned `updateServiceWorker` to its caller. Deferring this to a
        // microtask matches that, since the source code's `onRegisteredSW`
        // closes over `updateServiceWorker` before it exists synchronously.
        queueMicrotask(() => {
          options.onRegisteredSW?.("/sw.js", registration);
        });
        return updateServiceWorkerMock;
      },
    );

    registerOfflineServiceWorker();
    await Promise.resolve();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("checks for a new deployment on the polling interval", () => {
    vi.advanceTimersByTime(15 * 60 * 1000);

    expect(updateMock).toHaveBeenCalledTimes(1);
  });

  it("checks for a new deployment when the tab becomes visible again", () => {
    Object.defineProperty(document, "visibilityState", {
      value: "visible",
      configurable: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));

    expect(updateMock).toHaveBeenCalledTimes(1);
  });

  it("shows a notification that does not auto-close when an update is ready", () => {
    onNeedRefresh();

    expect(notificationsShowMock).toHaveBeenCalledWith(
      expect.objectContaining({ autoClose: false, withCloseButton: true }),
    );
  });

  it("does not reload before the waiting worker finishes activating", () => {
    const waitingWorker = _makeFakeWaitingWorker();
    Object.defineProperty(registration, "waiting", { value: waitingWorker });
    onNeedRefresh();

    _getOnUpdateFromNotification()();

    expect(updateServiceWorkerMock).toHaveBeenCalledTimes(1);
    expect(reloadMock).not.toHaveBeenCalled();
  });

  it("re-shows the notification on the next poll tick while dismissed but still pending", () => {
    const waitingWorker = _makeFakeWaitingWorker();
    Object.defineProperty(registration, "waiting", { value: waitingWorker });

    vi.advanceTimersByTime(15 * 60 * 1000);

    expect(notificationsShowMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: "service-worker-update-available" }),
    );
  });

  it("reloads the page once the waiting worker activates after being accepted", () => {
    const waitingWorker = _makeFakeWaitingWorker();
    Object.defineProperty(registration, "waiting", { value: waitingWorker });
    onNeedRefresh();
    _getOnUpdateFromNotification()();

    waitingWorker.activate();

    expect(reloadMock).toHaveBeenCalledTimes(1);
  });
});
