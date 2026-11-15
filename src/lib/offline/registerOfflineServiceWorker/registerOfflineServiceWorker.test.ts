import { fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { registerOfflineServiceWorker } from "@/lib/offline/registerOfflineServiceWorker/registerOfflineServiceWorker";
import { render } from "@/test-utils";
import { registerSW as registerSWMock } from "@/test-utils/virtualPwaRegisterStub";
import type { ReactElement } from "react";

const { notificationsShowMock } = vi.hoisted(() => {
  return { notificationsShowMock: vi.fn() };
});

const UPDATE_CHECK_INTERVAL_MS = 30 * 60 * 1000;

vi.mock("@mantine/notifications", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@mantine/notifications")>();
  return {
    ...actual,
    notifications: { ...actual.notifications, show: notificationsShowMock },
  };
});

type FakeWaitingWorker = {
  state: ServiceWorkerState;
  addEventListener: (type: string, listener: () => void) => void;
  activate: () => void;
};

type FakeRegistration = {
  update: () => Promise<void>;
  waiting: FakeWaitingWorker | undefined;
};

/** Minimal double for the subset of `ServiceWorker` this module reads. */
function _makeFakeWaitingWorker(): FakeWaitingWorker {
  const listeners: Array<() => void> = [];
  const worker: FakeWaitingWorker = {
    state: "installed",
    addEventListener: (_type, listener) => {
      listeners.push(listener);
    },
    activate: () => {
      worker.state = "activated";
      listeners.forEach((listener) => {
        listener();
      });
    },
  };
  return worker;
}

/** Clicks the "Update now" button in the most recently shown notification. */
function _clickUpdateButton(): void {
  const lastCall = notificationsShowMock.mock.calls.at(-1)?.[0] as {
    message: ReactElement;
  };
  render(lastCall.message);
  fireEvent.click(screen.getByRole("button", { name: /update now/i }));
}

describe("registerOfflineServiceWorker", () => {
  let updateMock: ReturnType<typeof vi.fn>;
  let updateServiceWorkerMock: ReturnType<typeof vi.fn>;
  let reloadMock: ReturnType<typeof vi.fn>;
  let registration: FakeRegistration;
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
          reg: FakeRegistration | undefined,
        ) => void;
        onNeedRefresh?: () => void;
      }) => {
        registration = {
          update: updateMock,
          waiting: undefined,
        };
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
    vi.advanceTimersByTime(UPDATE_CHECK_INTERVAL_MS);

    expect(updateMock).toHaveBeenCalledTimes(1);
  });

  it("ignores a tab-focus event before a full interval has passed since the last check", () => {
    Object.defineProperty(document, "visibilityState", {
      value: "visible",
      configurable: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));

    expect(updateMock).not.toHaveBeenCalled();
  });

  it("checks again on a tab-focus event once a full interval has passed", () => {
    vi.setSystemTime(Date.now() + UPDATE_CHECK_INTERVAL_MS);
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
    registration.waiting = waitingWorker;
    onNeedRefresh();

    _clickUpdateButton();

    expect(updateServiceWorkerMock).toHaveBeenCalledTimes(1);
    expect(reloadMock).not.toHaveBeenCalled();
  });

  it("shows the notification again on a poll tick while a waiting worker is still pending", () => {
    registration.waiting = _makeFakeWaitingWorker();

    vi.advanceTimersByTime(UPDATE_CHECK_INTERVAL_MS);

    expect(notificationsShowMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: "service-worker-update-available" }),
    );
  });

  it("reloads the page once the waiting worker activates after being accepted", () => {
    const waitingWorker = _makeFakeWaitingWorker();
    registration.waiting = waitingWorker;
    onNeedRefresh();
    _clickUpdateButton();

    waitingWorker.activate();

    expect(reloadMock).toHaveBeenCalledTimes(1);
  });
});
