import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { ReactNode } from "react";

import { I18nProvider } from "@lingui/react";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { i18n } from "@/i18n/i18n";
import { useDashboardPublishingControl } from "@/views/DashboardApp/DashboardShareModal/useDashboardPublishingControl/useDashboardPublishingControl";

type SlugVerdict = { isValid: true } | { isValid: false; reason: "taken" };

type SlugValidationVariables = {
  slug: string;
  dashboardId: string;
  visibility: Dashboard.Visibility;
};

const publish = vi.fn();
const unpublish = vi.fn();
/**
 * Hoisted because `vi.mock`'s factory runs before the module body: a plain
 * `const` would still be in its temporal dead zone when the factory reads it.
 */
const { notifyError } = vi.hoisted(() => {
  return { notifyError: vi.fn() };
});
const onShareableLimitReached = vi.fn();

/**
 * The publish mutation's `onError`, captured from the mocked client so the
 * failure branch can be driven directly. The real path to it runs through
 * PostgREST and a snapshot transition, neither of which this hook owns.
 */
let publishOnError: ((error: Error) => void) | undefined;

/**
 * The verdict the mocked server returns for the next slug check. Tests that
 * exercise the accepted/rejected flags set this before advancing the timers.
 */
let nextSlugVerdict: SlugVerdict = { isValid: true };
let onSlugValidated:
  | ((verdict: SlugVerdict, variables: SlugValidationVariables) => void)
  | undefined;

/**
 * Withheld responses, in dispatch order, when `isDeferringSlugResponses` is
 * on. Calling them in another order is the only way to reproduce a network
 * that answers two in-flight checks out of order, which is what the
 * superseded-answer guard exists for.
 */
let deferredSlugResponses: Array<() => void> = [];
let isDeferringSlugResponses = false;

/**
 * Resolves synchronously so a test can observe the derived slug flags. The
 * real hook resolves asynchronously, but the flags under test depend only on
 * which slug and namespace the answer was given for, not on the timing.
 */
const validateSlug = vi.fn((variables: SlugValidationVariables) => {
  const verdict = nextSlugVerdict;
  const respond = (): void => {
    onSlugValidated?.(verdict, variables);
  };
  if (isDeferringSlugResponses) {
    deferredSlugResponses.push(respond);
    return;
  }
  respond();
});

vi.mock("@/clients/dashboards/DashboardClient/DashboardClient", () => {
  return {
    DashboardClient: {
      usePublishDashboard: (options: { onError: (error: Error) => void }) => {
        publishOnError = options.onError;
        return [publish, false] as const;
      },
      useUnpublishDashboard: () => {
        return [unpublish, false] as const;
      },
      useValidateDashboardSlug: (options: {
        onSuccess: (
          verdict: SlugVerdict,
          variables: SlugValidationVariables,
        ) => void;
      }) => {
        onSlugValidated = options.onSuccess;
        return [validateSlug, false] as const;
      },
    },
  };
});

vi.mock("@/utils/notifications/notify", () => {
  return { notifyError, notifySuccess: vi.fn() };
});

vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: () => {
      return { id: "ws-1", slug: "acme", name: "Acme" };
    },
  };
});

function makeDashboard(
  visibility: Dashboard.Visibility,
  options: Readonly<{ isRestricted?: boolean }> = {},
): Dashboard.T {
  return {
    id: "11111111-2222-4333-8444-555555555555",
    workspaceId: "ws-1",
    name: "Q3 Revenue",
    slug: undefined,
    visibility,
    isPublic: visibility === "public",
    isRestricted: options.isRestricted ?? false,
    config: { content: [], root: {}, zones: {} },
  } as unknown as Dashboard.T;
}

function TestWrapper({ children }: Readonly<{ children: ReactNode }>) {
  return <I18nProvider i18n={i18n}>{children}</I18nProvider>;
}

/** The hook needs a Lingui context for its notification copy. */
function renderControl(
  visibility: Dashboard.Visibility,
  options: Readonly<{ isRestricted?: boolean }> = {},
) {
  return renderHook(
    () => {
      return useDashboardPublishingControl({
        dashboard: makeDashboard(visibility, options),
        onShareableLimitReached,
      });
    },
    { wrapper: TestWrapper },
  );
}

describe("useDashboardPublishingControl", () => {
  beforeEach(() => {
    nextSlugVerdict = { isValid: true };
    isDeferringSlugResponses = false;
    deferredSlugResponses = [];
    publish.mockClear();
    unpublish.mockClear();
    validateSlug.mockClear();
    notifyError.mockClear();
    onShareableLimitReached.mockClear();
  });

  it("starts with the target equal to the persisted visibility", () => {
    const { result } = renderControl("public");
    expect(result.current.targetVisibility).toBe("public");
    expect(result.current.actionKind).toBe("republish");
  });

  // New dashboards are `visibility: draft` with `is_restricted` defaulting
  // false, so General access already shows "Anyone in Dashboards". The publish
  // target has to match that on open: otherwise Publish stays disabled until
  // the user re-selects the option that is already selected.
  it("opens a workspace-shared draft ready to publish to the workspace", () => {
    const { result } = renderControl("draft", { isRestricted: false });
    expect(result.current.targetVisibility).toBe("workspace");
    expect(result.current.actionKind).toBe("publish_workspace");
    act(() => {
      result.current.onPrimaryAction();
    });
    expect(publish).toHaveBeenCalledWith(
      expect.objectContaining({ visibility: "workspace" }),
    );
  });

  it("publishes to the workspace when the target is workspace", () => {
    const { result } = renderControl("draft");
    act(() => {
      result.current.onGeneralAccessChange("workspace");
    });
    expect(result.current.actionKind).toBe("publish_workspace");
    act(() => {
      result.current.onPrimaryAction();
    });
    expect(publish).toHaveBeenCalledWith(
      expect.objectContaining({ visibility: "workspace" }),
    );
    expect(unpublish).not.toHaveBeenCalled();
  });

  it("unpublishes when the target is draft and the dashboard is published", () => {
    const { result } = renderControl("workspace");
    act(() => {
      result.current.onGeneralAccessChange("private");
    });
    expect(result.current.actionKind).toBe("unpublish");
    act(() => {
      result.current.onPrimaryAction();
    });
    expect(unpublish).toHaveBeenCalledWith(
      expect.objectContaining({ dashboardId: makeDashboard("workspace").id }),
    );
    expect(publish).not.toHaveBeenCalled();
  });

  it("does nothing when there is no audience to publish to", () => {
    const { result } = renderControl("draft", { isRestricted: true });
    act(() => {
      result.current.onPrimaryAction();
    });
    expect(publish).not.toHaveBeenCalled();
    expect(unpublish).not.toHaveBeenCalled();
  });

  it("re-validates the slug against the new namespace when the target changes", () => {
    vi.useFakeTimers();
    const { result } = renderControl("draft");

    act(() => {
      result.current.onSlugInputChange("q3-revenue");
      result.current.onGeneralAccessChange("workspace");
    });
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(validateSlug).toHaveBeenLastCalledWith(
      expect.objectContaining({ slug: "q3-revenue", visibility: "workspace" }),
    );

    act(() => {
      result.current.onGeneralAccessChange("public");
    });
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(validateSlug).toHaveBeenLastCalledWith(
      expect.objectContaining({ slug: "q3-revenue", visibility: "public" }),
    );
    vi.useRealTimers();
  });

  it("skips validation entirely for a draft target, which has no URL", () => {
    vi.useFakeTimers();
    validateSlug.mockClear();
    const { result } = renderControl("workspace");
    act(() => {
      result.current.onSlugInputChange("q3-revenue");
      result.current.onGeneralAccessChange("private");
    });
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(validateSlug).not.toHaveBeenCalled();
    // The check never runs, so nothing may report it as outstanding: a
    // permanently pending flag is a spinner that can never resolve and would
    // disable the very Unpublish button the user is reaching for.
    expect(result.current.hasPendingSlugCheck).toBe(false);
    expect(result.current.isSlugAccepted).toBe(false);
    expect(result.current.isSlugRejected).toBe(false);
    expect(result.current.slugErrorMessage).toBeUndefined();
    vi.useRealTimers();
  });

  it("refuses to publish over a slug the server has rejected", () => {
    vi.useFakeTimers();
    nextSlugVerdict = { isValid: false, reason: "taken" };
    const { result } = renderControl("draft");
    act(() => {
      result.current.onSlugInputChange("q3-revenue");
      result.current.onGeneralAccessChange("workspace");
    });
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(result.current.isSlugRejected).toBe(true);
    // The rejection has to reach the user as words, not just as a disabled
    // button: without the reason, the field simply refuses to work.
    expect(result.current.slugErrorMessage).toMatch(/taken/i);

    act(() => {
      result.current.onPrimaryAction();
    });
    expect(publish).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("still unpublishes when the slug in the field is rejected", () => {
    vi.useFakeTimers();
    nextSlugVerdict = { isValid: false, reason: "taken" };
    const { result } = renderControl("workspace");
    act(() => {
      result.current.onSlugInputChange("q3-revenue");
    });
    act(() => {
      vi.advanceTimersByTime(600);
    });
    act(() => {
      result.current.onGeneralAccessChange("private");
    });
    act(() => {
      result.current.onPrimaryAction();
    });
    // A slug the user is discarding must not block the unpublish.
    expect(unpublish).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("stops reporting a verdict as current once the namespace changes", () => {
    vi.useFakeTimers();
    const { result } = renderControl("draft");
    act(() => {
      result.current.onSlugInputChange("q3-revenue");
      result.current.onGeneralAccessChange("workspace");
    });
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(result.current.isSlugAccepted).toBe(true);

    act(() => {
      result.current.onGeneralAccessChange("public");
    });
    // The workspace answer says nothing about the public namespace, where the
    // slug may well be taken, so the honest state here is pending.
    expect(result.current.isSlugAccepted).toBe(false);
    expect(result.current.hasPendingSlugCheck).toBe(true);
    vi.useRealTimers();
  });

  // Two checks in flight and the network answers the OLDER one last. Writing
  // that superseded answer would point `lastValidatedSlug` at a slug the field
  // no longer holds, and nothing is left in flight to correct it: the field
  // spins forever and `onPrimaryAction` silently refuses to publish.
  it("ignores a slug answer that a later keystroke has superseded", () => {
    vi.useFakeTimers();
    isDeferringSlugResponses = true;
    const { result } = renderControl("draft");

    act(() => {
      result.current.onGeneralAccessChange("workspace");
      result.current.onSlugInputChange("q3-rev");
    });
    act(() => {
      vi.advanceTimersByTime(600);
    });
    act(() => {
      result.current.onSlugInputChange("q3-revenue");
    });
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(validateSlug).toHaveBeenCalledTimes(2);

    // Newest answer first, then the one it superseded.
    act(() => {
      deferredSlugResponses[1]?.();
    });
    expect(result.current.isSlugAccepted).toBe(true);
    act(() => {
      deferredSlugResponses[0]?.();
    });

    expect(result.current.isSlugAccepted).toBe(true);
    expect(result.current.hasPendingSlugCheck).toBe(false);
    act(() => {
      result.current.onPrimaryAction();
    });
    expect(publish).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  // The UI gate is optimistic while its permission query is in flight, and the
  // count it caches is workspace-wide while the exemption is per dashboard, so
  // a publish elsewhere can leave it stale. These two pin what happens when the
  // database is therefore the thing that says no.
  it("reports the plan limit to its caller instead of a generic failure", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    renderControl("draft");
    act(() => {
      publishOnError?.(
        Object.assign(
          new Error(
            "This workspace's plan allows 1 shared or public dashboard(s)",
          ),
          {
            name: "PostgrestError",
            code: "42501",
            details: null,
            hint: "shareable_dashboard_limit",
          },
        ),
      );
    });
    expect(onShareableLimitReached).toHaveBeenCalledTimes(1);
    // "Please try again" would be false: no retry succeeds on this plan.
    expect(notifyError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("still shows the generic failure for any other publish error", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    renderControl("draft");
    act(() => {
      publishOnError?.(new Error("network unreachable"));
    });
    expect(onShareableLimitReached).not.toHaveBeenCalled();
    expect(notifyError).toHaveBeenCalledTimes(1);
    consoleError.mockRestore();
  });
});
