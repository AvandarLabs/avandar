import { I18nProvider } from "@lingui/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@/i18n/i18n";
import { useOfflineGate } from "@/lib/hooks/browser/useOfflineGate/useOfflineGate";
import { renderHook } from "@/test-utils";

vi.mock("@/utils/notifications/notify", () => {
  return {
    notifyError: vi.fn(),
  };
});

function renderOfflineGateHook() {
  return renderHook(
    () => {
      return useOfflineGate();
    },
    {
      wrapper: ({ children }) => {
        return <I18nProvider i18n={i18n}>{children}</I18nProvider>;
      },
    },
  );
}

describe("useOfflineGate", () => {
  afterEach(() => {
    vi.stubGlobal("navigator", { onLine: true });
  });

  it("is not blocked when online", () => {
    vi.stubGlobal("navigator", { onLine: true });
    const { result } = renderOfflineGateHook();
    expect(result.current.isBlocked).toBe(false);
  });

  it("is blocked when offline", () => {
    vi.stubGlobal("navigator", { onLine: false });
    const { result } = renderOfflineGateHook();
    expect(result.current.isBlocked).toBe(true);
  });

  it("guard short-circuits when offline", () => {
    vi.stubGlobal("navigator", { onLine: false });
    const { result } = renderOfflineGateHook();
    const fn = vi.fn();
    const guarded = result.current.guard(fn);
    guarded();
    expect(fn).not.toHaveBeenCalled();
  });

  it("guard calls through when online", () => {
    vi.stubGlobal("navigator", { onLine: true });
    const { result } = renderOfflineGateHook();
    const fn = vi.fn();
    result.current.guard(fn)();
    expect(fn).toHaveBeenCalledOnce();
  });
});
