import { I18nProvider } from "@lingui/react";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@/i18n/i18n";
import { useDashboardPublishingControl } from "@/views/DashboardApp/DashboardShareModal/useDashboardPublishingControl";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { ReactNode } from "react";

type SlugVerdict = { isValid: true } | { isValid: false; reason: "taken" };

const publish = vi.fn();
const unpublish = vi.fn();

/**
 * The verdict the mocked server returns for the next slug check. Tests that
 * exercise the accepted/rejected flags set this before advancing the timers.
 */
let nextSlugVerdict: SlugVerdict = { isValid: true };
let onSlugValidated:
  | ((verdict: SlugVerdict, variables: { slug: string }) => void)
  | undefined;

/**
 * Resolves synchronously so a test can observe the derived slug flags. The
 * real hook resolves asynchronously, but the flags under test depend only on
 * which slug and namespace the answer was given for, not on the timing.
 */
const validateSlug = vi.fn((variables: { slug: string }) => {
  onSlugValidated?.(nextSlugVerdict, variables);
});

vi.mock("@/clients/dashboards/DashboardClient", () => {
  return {
    DashboardClient: {
      usePublishDashboard: () => {
        return [publish, false] as const;
      },
      useUnpublishDashboard: () => {
        return [unpublish, false] as const;
      },
      useValidateDashboardSlug: (options: {
        onSuccess: (verdict: SlugVerdict, variables: { slug: string }) => void;
      }) => {
        onSlugValidated = options.onSuccess;
        return [validateSlug, false] as const;
      },
    },
  };
});

vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: () => {
      return { id: "ws-1", slug: "acme", name: "Acme" };
    },
  };
});

function makeDashboard(visibility: Dashboard.Visibility): Dashboard.T {
  return {
    id: "11111111-2222-4333-8444-555555555555",
    workspaceId: "ws-1",
    name: "Q3 Revenue",
    slug: undefined,
    visibility,
    isPublic: visibility === "public",
    config: { content: [], root: {}, zones: {} },
  } as unknown as Dashboard.T;
}

function TestWrapper({ children }: Readonly<{ children: ReactNode }>) {
  return <I18nProvider i18n={i18n}>{children}</I18nProvider>;
}

/** The hook needs a Lingui context for its notification copy. */
function renderControl(visibility: Dashboard.Visibility) {
  return renderHook(
    () => {
      return useDashboardPublishingControl({
        dashboard: makeDashboard(visibility),
      });
    },
    { wrapper: TestWrapper },
  );
}

describe("useDashboardPublishingControl", () => {
  beforeEach(() => {
    nextSlugVerdict = { isValid: true };
    publish.mockClear();
    unpublish.mockClear();
    validateSlug.mockClear();
  });

  it("starts with the target equal to the persisted visibility", () => {
    const { result } = renderControl("public");
    expect(result.current.targetVisibility).toBe("public");
    expect(result.current.actionKind).toBe("republish");
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
    const { result } = renderControl("draft");
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
});
