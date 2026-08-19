import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Component, createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@/test-utils";
import type { GoogleToken } from "@/lib/hooks/useGooglePickerAPI";
import type {
  GooglePickerAPI,
  GPickerDocumentObject,
  GPickerResponseObject,
} from "@/lib/types/google-picker";
import type { ReactNode } from "react";

/**
 * The Cloud project number, read off the numeric prefix of `GOOGLE_CLIENT_ID`
 * in `.env.development.edge`. `.env.development` carries it as
 * `VITE_GOOGLE_PICKER_APP_ID`, and `tests/vitest.setup.ts` loads that file, so
 * the hook under test reads the real configured value rather than a stub.
 */
const EXPECTED_APP_ID = "323714789211";

const { useGooglePickerAPIMock, useCurrentUserProfileMock, builderCalls } =
  vi.hoisted(() => {
    return {
      useGooglePickerAPIMock: vi.fn(),
      useCurrentUserProfileMock: vi.fn(),
      builderCalls: new Map<string, unknown[]>(),
    };
  });

vi.mock("@/lib/hooks/useGooglePickerAPI", () => {
  return { useGooglePickerAPI: useGooglePickerAPIMock };
});

vi.mock("@/hooks/users/useCurrentUserProfile", () => {
  return { useCurrentUserProfile: useCurrentUserProfileMock };
});

vi.mock("@/clients/APIClient", () => {
  return {
    APIClient: {
      get: vi.fn(async () => {
        return { tokens: [_googleToken()] };
      }),
    },
  };
});

function _googleToken(): GoogleToken {
  return {
    access_token: "test-access-token",
    // A Google `sub`, which is what the database stores, not a UUID.
    google_account_id: "108374652910384756291",
    google_email: "picker-test@example.com",
  } as GoogleToken;
}

/**
 * A `PickerBuilder` stand-in that records which builder methods were called
 * with which arguments, and captures the callback so a test can drive a Picker
 * response through it. Every setter returns `this`, matching the real fluent
 * builder, so a missing method shows up as a `TypeError` rather than as a
 * silently skipped call.
 */
function _makeRecordingPickerAPI(): {
  pickerAPI: GooglePickerAPI;
  getCallArgs: (method: string) => unknown[] | undefined;
  fireCallback: (response: GPickerResponseObject) => void;
} {
  let callback: ((response: GPickerResponseObject) => void) | undefined;

  const record = (method: string) => {
    return (...args: unknown[]): unknown => {
      builderCalls.set(method, args);
      return builder;
    };
  };

  const builder = {
    addView: record("addView"),
    setOAuthToken: record("setOAuthToken"),
    setDeveloperKey: record("setDeveloperKey"),
    setAppId: record("setAppId"),
    setMaxItems: record("setMaxItems"),
    setSelectableMimeTypes: record("setSelectableMimeTypes"),
    setCallback: (method: (response: GPickerResponseObject) => void) => {
      callback = method;
      builderCalls.set("setCallback", [method]);
      return builder;
    },
    build: () => {
      builderCalls.set("build", []);
      return { setVisible: vi.fn() };
    },
  };

  const docsView = {
    setMode: () => {
      return docsView;
    },
    setMimeTypes: () => {
      return docsView;
    },
    setIncludeFolders: () => {
      return docsView;
    },
  };

  const pickerAPI = {
    PickerBuilder: function PickerBuilderStub() {
      return builder;
    },
    DocsView: function DocsViewStub() {
      return docsView;
    },
    DocsViewMode: { LIST: "list" },
    ViewId: { SPREADSHEETS: "spreadsheets" },
    Action: { PICKED: "picked", CANCEL: "cancel", ERROR: "error" },
  } as unknown as GooglePickerAPI;

  return {
    pickerAPI,
    getCallArgs: (method) => {
      return builderCalls.get(method);
    },
    fireCallback: (response) => {
      if (!callback) {
        throw new Error("Expected the builder to have received a callback.");
      }
      callback(response);
    },
  };
}

function _wrapper({ children }: { children: ReactNode }): JSX.Element {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return createElement(QueryClientProvider, { client: queryClient }, children);
}

/**
 * Errors thrown while rendering under {@link _boundaryWrapper}. The hook's
 * missing-app-id guard fires on the render *after* the token query resolves,
 * so it cannot be caught by wrapping `renderHook` in `expect(...).toThrow`.
 */
const caughtRenderErrors: Error[] = [];

class _RenderErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): { hasError: boolean } {
    caughtRenderErrors.push(error);
    return { hasError: true };
  }

  override render(): ReactNode {
    return this.state.hasError ? null : this.props.children;
  }
}

function _boundaryWrapper({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  return createElement(
    _RenderErrorBoundary,
    null,
    createElement(_wrapper, { children }),
  );
}

const PICKED_DOCUMENT: GPickerDocumentObject = {
  id: "1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789",
  name: "quarterly-numbers",
};

describe("useGooglePicker", () => {
  beforeEach(() => {
    builderCalls.clear();
    caughtRenderErrors.length = 0;
    useCurrentUserProfileMock.mockReturnValue([
      { id: "00000000-0000-4000-8000-000000000001" },
      false,
    ]);
  });

  async function _renderPicker(
    options: Parameters<
      typeof import("@/hooks/ui/useGooglePicker").useGooglePicker
    >[0] = {},
  ): Promise<ReturnType<typeof _makeRecordingPickerAPI>> {
    const harness = _makeRecordingPickerAPI();
    useGooglePickerAPIMock.mockReturnValue([harness.pickerAPI, false]);

    const { useGooglePicker } = await import("@/hooks/ui/useGooglePicker");
    renderHook(
      () => {
        return useGooglePicker(options);
      },
      { wrapper: _wrapper },
    );

    await waitFor(() => {
      expect(harness.getCallArgs("build")).toBeDefined();
    });

    return harness;
  }

  it("passes the Cloud project number to setAppId", async () => {
    const harness = await _renderPicker();

    expect(harness.getCallArgs("setAppId")).toEqual([EXPECTED_APP_ID]);
  });

  it("still sets the developer key and the OAuth token", async () => {
    // Positive control for the test above. Without it, a recording builder that
    // silently accepted any method at all would make `setAppId` look wired even
    // if the real builder never received the other two calls it needs.
    const harness = await _renderPicker();

    expect(harness.getCallArgs("setDeveloperKey")).toHaveLength(1);
    expect(harness.getCallArgs("setOAuthToken")).toEqual(["test-access-token"]);
  });

  it("reports a pick to onGoogleSheetPicked", async () => {
    const onGoogleSheetPicked = vi.fn();
    const onCancel = vi.fn();
    const harness = await _renderPicker({ onGoogleSheetPicked, onCancel });

    harness.fireCallback({
      action: "picked",
      docs: [PICKED_DOCUMENT],
      viewToken: ["spreadsheets"],
    } as unknown as GPickerResponseObject);

    expect(onGoogleSheetPicked).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("reports a dismissal to onCancel and not to onGoogleSheetPicked", async () => {
    const onGoogleSheetPicked = vi.fn();
    const onCancel = vi.fn();
    const harness = await _renderPicker({ onGoogleSheetPicked, onCancel });

    harness.fireCallback({
      action: "cancel",
    } as unknown as GPickerResponseObject);

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onGoogleSheetPicked).not.toHaveBeenCalled();
  });

  it("refuses to build a Picker when the app id is not configured", async () => {
    // A Picker built with `setAppId(undefined)` opens, returns a file id, and
    // then 404s on export, which reads as a scope problem. Failing here instead
    // keeps a missing deployment variable diagnosable.
    vi.stubEnv("VITE_GOOGLE_PICKER_APP_ID", "");
    const harness = _makeRecordingPickerAPI();
    useGooglePickerAPIMock.mockReturnValue([harness.pickerAPI, false]);
    const { useGooglePicker } = await import("@/hooks/ui/useGooglePicker");

    try {
      renderHook(
        () => {
          return useGooglePicker({});
        },
        { wrapper: _boundaryWrapper },
      );

      // React replays a failed render once in development to recover a better
      // stack, so the boundary can see the same error more than once.
      await waitFor(() => {
        expect(caughtRenderErrors.length).toBeGreaterThan(0);
      });
      expect(caughtRenderErrors[0]?.message).toMatch(/app id/i);
      // The Picker must never be built with an empty app id: one that is would
      // open, hand back a file id, and 404 on export.
      expect(harness.getCallArgs("build")).toBeUndefined();
      expect(harness.getCallArgs("setAppId")).toBeUndefined();
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("reports a Picker failure to onError and not to onGoogleSheetPicked", async () => {
    const onGoogleSheetPicked = vi.fn();
    const onError = vi.fn();
    const harness = await _renderPicker({ onGoogleSheetPicked, onError });

    const errorResponse = {
      action: "error",
    } as unknown as GPickerResponseObject;
    harness.fireCallback(errorResponse);

    expect(onError).toHaveBeenCalledWith(errorResponse);
    expect(onGoogleSheetPicked).not.toHaveBeenCalled();
  });
});
