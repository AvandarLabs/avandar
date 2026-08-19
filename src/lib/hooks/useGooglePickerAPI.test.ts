import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@/test-utils";
import type { GooglePickerAPI } from "@/lib/types/google-picker";

const GAPI_SCRIPT_SRC = "https://apis.google.com/js/api.js";

const { notifyErrorMock, loggerErrorMock } = vi.hoisted(() => {
  return { notifyErrorMock: vi.fn(), loggerErrorMock: vi.fn() };
});

vi.mock("@/utils/notifications/notify", () => {
  return { notifyError: notifyErrorMock };
});

vi.mock("@/utils/Logger", () => {
  return { Logger: { error: loggerErrorMock } };
});

/**
 * The `google.picker` shape after a JSON round trip: every enum survives and
 * every constructor is gone. This is what the persisted React Query cache used
 * to hand back on the boot after a successful pick.
 */
function _makeConstructorLessPickerNamespace(): void {
  window.google = {
    picker: {
      ViewId: { SPREADSHEETS: "spreadsheets" },
      Action: { PICKED: "picked", CANCEL: "cancel", ERROR: "error" },
    } as unknown as GooglePickerAPI,
  };
}

function _installLivePickerNamespace(): void {
  window.google = {
    picker: {
      PickerBuilder: function PickerBuilderStub() {
        return {};
      },
      ViewId: { SPREADSHEETS: "spreadsheets" },
    } as unknown as GooglePickerAPI,
  };
}

/**
 * A `gapi` whose `load` installs the live namespace and calls back.
 *
 * `namespaceDelayMs` installs the namespace that many milliseconds *after* the
 * callback, which is how gapi can report a module as loaded before it can be
 * used.
 */
function _installGAPI(options: { namespaceDelayMs?: number } = {}): {
  load: ReturnType<typeof vi.fn>;
} {
  const load = vi.fn((_library: string, spec: gapi.CallbackOrConfig) => {
    const callback = typeof spec === "function" ? spec : spec.callback;
    if (options.namespaceDelayMs === undefined) {
      _installLivePickerNamespace();
      callback?.();
      return;
    }
    callback?.();
    window.setTimeout(_installLivePickerNamespace, options.namespaceDelayMs);
  });
  window.gapi = { load } as unknown as typeof gapi;
  return { load };
}

async function _importHook() {
  return await import("@/lib/hooks/useGooglePickerAPI");
}

describe("useGooglePickerAPI", () => {
  beforeEach(() => {
    // The load is a module-level singleton, so every test needs its own copy of
    // the module.
    vi.resetModules();
  });

  afterEach(() => {
    delete (window as { gapi?: unknown }).gapi;
    delete window.google;
    notifyErrorMock.mockClear();
    loggerErrorMock.mockClear();
    document
      .querySelectorAll(`script[src="${GAPI_SCRIPT_SRC}"]`)
      .forEach((script) => {
        script.remove();
      });
  });

  it("returns the picker namespace once gapi has loaded the module", async () => {
    _installGAPI();
    const { useGooglePickerAPI } = await _importHook();

    const { result } = renderHook(() => {
      return useGooglePickerAPI();
    });

    await waitFor(() => {
      expect(result.current[1]).toBe(false);
    });
    expect(typeof result.current[0]?.PickerBuilder).toBe("function");
  });

  it("loads the module even when the namespace is a constructor-less copy", async () => {
    // The regression this hook exists to prevent: the loaded API used to come
    // from the persisted React Query cache, which JSON-serializes its entries.
    // A rehydrated namespace has the enums but no `PickerBuilder`, and it read
    // as fresh success data, so `gapi.load` never ran again and the Picker
    // could not be built until IndexedDB was cleared.
    _makeConstructorLessPickerNamespace();
    const { load } = _installGAPI();
    const { useGooglePickerAPI } = await _importHook();

    const { result } = renderHook(() => {
      return useGooglePickerAPI();
    });

    await waitFor(() => {
      expect(result.current[1]).toBe(false);
    });
    expect(load).toHaveBeenCalledWith("picker", expect.anything());
    expect(typeof result.current[0]?.PickerBuilder).toBe("function");
  });

  it("stays loading until PickerBuilder is installed", async () => {
    // gapi can report the module as loaded a tick before the namespace is
    // usable. Handing back the namespace on the callback alone offers Pick
    // before `new PickerBuilder()` would work.
    _installGAPI({ namespaceDelayMs: 20 });
    const { useGooglePickerAPI } = await _importHook();

    const { result } = renderHook(() => {
      return useGooglePickerAPI();
    });

    expect(result.current[0]).toBeUndefined();
    expect(result.current[1]).toBe(true);
    await waitFor(() => {
      expect(typeof result.current[0]?.PickerBuilder).toBe("function");
    });
  });

  it("loads the script and the module once for several callers", async () => {
    const { load } = _installGAPI();
    const { useGooglePickerAPI } = await _importHook();

    const first = renderHook(() => {
      return useGooglePickerAPI();
    });
    const second = renderHook(() => {
      return useGooglePickerAPI();
    });

    await waitFor(() => {
      expect(first.result.current[1]).toBe(false);
      expect(second.result.current[1]).toBe(false);
    });
    expect(load).toHaveBeenCalledTimes(1);
    expect(first.result.current[0]).toBe(second.result.current[0]);
  });

  it("leaves the Google API script in the document after unmount", async () => {
    // Removing api.js on cleanup (React Strict Mode remounts, tab switches)
    // leaves `window.gapi` on the window with no script behind it, which reads
    // as "gapi is ready" on the next mount while `picker` can never load.
    const { useGooglePickerAPI } = await _importHook();

    const { unmount } = renderHook(() => {
      return useGooglePickerAPI();
    });

    expect(
      document.querySelector(`script[src="${GAPI_SCRIPT_SRC}"]`),
    ).not.toBeNull();
    unmount();
    expect(
      document.querySelector(`script[src="${GAPI_SCRIPT_SRC}"]`),
    ).not.toBeNull();
  });

  it("stops loading and reports the failure when gapi cannot load the module", async () => {
    window.gapi = {
      load: vi.fn((_library: string, spec: gapi.CallbackOrConfig) => {
        if (typeof spec !== "function") {
          spec.onerror?.();
        }
      }),
    } as unknown as typeof gapi;
    const { useGooglePickerAPI } = await _importHook();

    const { result } = renderHook(() => {
      return useGooglePickerAPI();
    });

    await waitFor(() => {
      expect(result.current[1]).toBe(false);
    });
    expect(result.current[0]).toBeUndefined();
    expect(notifyErrorMock).toHaveBeenCalled();
    expect(loggerErrorMock).toHaveBeenCalled();
  });

  it("retries the load on a later mount after a failure", async () => {
    // A failed load is not permanent: the singleton drops the rejected promise
    // so the next mount can try again, which is what a user who reopens the
    // import tab after a network blip expects.
    const failingLoad = vi.fn(
      (_library: string, spec: gapi.CallbackOrConfig) => {
        if (typeof spec !== "function") {
          spec.onerror?.();
        }
      },
    );
    window.gapi = { load: failingLoad } as unknown as typeof gapi;
    const { useGooglePickerAPI } = await _importHook();

    const failed = renderHook(() => {
      return useGooglePickerAPI();
    });
    await waitFor(() => {
      expect(failed.result.current[1]).toBe(false);
    });
    failed.unmount();

    _installGAPI();
    const retried = renderHook(() => {
      return useGooglePickerAPI();
    });

    await waitFor(() => {
      expect(typeof retried.result.current[0]?.PickerBuilder).toBe("function");
    });
  });
});
