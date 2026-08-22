import type { WorkspaceId } from "$/models/Workspace/Workspace.types";
import type { SummarySpan } from "./buildShareSummary";
import type { ResourceShareRow } from "@/clients/permissions/ResourceShareClient";

import { describe, expect, it } from "vitest";

import { buildShareSummary } from "./buildShareSummary";

// `buildShareSummary` uses the global `t` macro from `@lingui/core/macro`
// internally, which reads from the active Lingui i18n singleton. The vitest
// setup (`tests/vitest.setup.ts`) activates an empty English catalog, so
// `t._({id, message})` calls return the source `message` here.
const baseLookups = {
  workspaceName: "Avandar Labs",
  resourceType: "dataset" as const,
  userById: {
    "u-1": "William Farr",
    "u-2": "John Snow",
  },
  groupById: {
    "g-1": "Analytics",
    "g-2": "Public datasets",
  },
};

/** Flattens spans into a single plain string for easy substring asserts. */
function flat(spans: SummarySpan[]): string {
  return spans
    .map((span) => {
      return span.kind === "text" ? span.text : span.label;
    })
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

function userShare(
  id: string,
  userId: string,
  role: "viewer" | "editor" | "admin" = "viewer",
): ResourceShareRow {
  return {
    id,
    workspaceId: "ws-1" as WorkspaceId,
    resourceType: "dataset",
    resourceId: "ds-1",
    principalType: "user",
    principalId: userId,
    role,
    requiresAppAccess: false,
  };
}

function groupShare(
  id: string,
  groupId: string,
  role: "viewer" | "editor" | "admin",
  requiresAppAccess: boolean,
): ResourceShareRow {
  return {
    id,
    workspaceId: "ws-1" as WorkspaceId,
    resourceType: "dataset",
    resourceId: "ds-1",
    principalType: "user_group",
    principalId: groupId,
    role,
    requiresAppAccess,
  };
}

describe("buildShareSummary", () => {
  it("returns the owner-only sentence when restricted with no shares", () => {
    const spans = buildShareSummary({
      shares: [],
      isRestricted: true,
      workspaceShareRole: null,
      ...baseLookups,
    });
    expect(flat(spans)).toBe("Only you have access to this dataset.");
  });

  it("describes general app access when unrestricted with no direct shares", () => {
    const spans = buildShareSummary({
      shares: [],
      isRestricted: false,
      workspaceShareRole: null,
      ...baseLookups,
    });
    expect(flat(spans)).toBe(
      "This dataset is accessible to anyone with Data Sources Viewer permission.",
    );
  });

  it("describes a surviving workspace share on a restricted resource", () => {
    const spans = buildShareSummary({
      shares: [],
      isRestricted: true,
      workspaceShareRole: "editor",
      ...baseLookups,
    });

    expect(flat(spans)).toBe(
      "This dataset is accessible to anyone with Data Sources Editor permission.",
    );
  });

  it("formats a single user share (restricted)", () => {
    const spans = buildShareSummary({
      shares: [userShare("s-1", "u-1", "editor")],
      isRestricted: true,
      workspaceShareRole: null,
      ...baseLookups,
    });
    expect(
      spans.some((span) => {
        return span.kind === "pill" && span.label === "William Farr";
      }),
    ).toBe(true);
    expect(flat(spans)).toBe("This dataset is shared with: William Farr.");
  });

  it("formats a group share with `requiresAppAccess` (intersection clause)", () => {
    const spans = buildShareSummary({
      shares: [groupShare("s-1", "g-1", "editor", true)],
      isRestricted: true,
      workspaceShareRole: null,
      ...baseLookups,
    });
    const text = flat(spans);
    expect(text).toContain("all members of");
    expect(text).toContain("Analytics");
    expect(text).toContain("who also have");
    expect(text).toContain("Data Sources");
    expect(text).toContain("access");
  });

  it("omits the intersection clause when `requiresAppAccess` is false", () => {
    const spans = buildShareSummary({
      shares: [groupShare("s-1", "g-1", "editor", false)],
      isRestricted: true,
      workspaceShareRole: null,
      ...baseLookups,
    });
    const text = flat(spans);
    expect(text).not.toContain("who also have");
    expect(text).toBe("This dataset is shared with: all members of Analytics.");
  });

  it("appends the general access clause when not restricted", () => {
    const spans = buildShareSummary({
      shares: [userShare("s-1", "u-1", "editor")],
      isRestricted: false,
      workspaceShareRole: "viewer",
      ...baseLookups,
    });
    const text = flat(spans);
    expect(text).toContain("anyone with");
    expect(text).toContain("Data Sources");
    expect(text).toContain("Viewer");
    expect(text).toContain(", and");
    expect(text).not.toContain("Avandar Labs");
  });

  it("appends a surviving workspace share when restricted", () => {
    const spans = buildShareSummary({
      shares: [userShare("s-1", "u-1", "editor")],
      isRestricted: true,
      workspaceShareRole: "viewer",
      ...baseLookups,
    });

    expect(flat(spans)).toBe(
      "This dataset is shared with: William Farr, and anyone with Data Sources Viewer permission.",
    );
  });

  it("joins multiple user + group shares with comma-and (restricted)", () => {
    const spans = buildShareSummary({
      shares: [
        userShare("s-1", "u-1", "viewer"),
        userShare("s-2", "u-2", "editor"),
        groupShare("s-3", "g-1", "editor", true),
        groupShare("s-4", "g-2", "viewer", false),
      ],
      isRestricted: true,
      workspaceShareRole: null,
      ...baseLookups,
    });
    const text = flat(spans);
    // Users are combined into one comma-separated fragment.
    expect(text).toContain("William Farr, John Snow");
    // Group fragments follow, comma-joined, with ", and " before the last.
    expect(text).toContain(
      "all members of Analytics who also have Data Sources access",
    );
    expect(text).toContain(", and all members of Public datasets");
    // No workspace clause when restricted.
    expect(text).not.toContain("anyone in");
  });

  it("renders the dashboard label for dashboard resources", () => {
    const spans = buildShareSummary({
      shares: [],
      isRestricted: true,
      workspaceShareRole: null,
      workspaceName: "Avandar Labs",
      resourceType: "dashboard",
      userById: {},
      groupById: {},
    });
    expect(flat(spans)).toBe("Only you have access to this dashboard.");
  });

  it("uses ', and' only before the very last fragment", () => {
    const spans = buildShareSummary({
      shares: [
        groupShare("s-1", "g-1", "viewer", false),
        groupShare("s-2", "g-2", "viewer", false),
      ],
      isRestricted: false,
      workspaceShareRole: "editor",
      ...baseLookups,
    });
    const text = flat(spans);
    expect(text).toContain(
      "all members of Analytics, all members of Public datasets, and anyone with Data Sources Editor permission",
    );
  });
});

describe("publication", () => {
  const base = {
    shares: [],
    isRestricted: true,
    workspaceShareRole: null,
    resourceType: "dashboard" as const,
    workspaceName: "Acme",
    userById: {},
    groupById: {},
  };

  it("says nothing about publication when the resource has none", () => {
    const spans = buildShareSummary({ ...base, publication: undefined });
    expect(
      spans
        .map((span) => {
          return span.kind === "text" && span.text;
        })
        .join(""),
    ).not.toContain("Published");
  });

  it("reports a draft dashboard as not published", () => {
    const spans = buildShareSummary({ ...base, publication: "draft" });
    expect(spans.at(-1)).toEqual({
      kind: "text",
      text: " Not published yet.",
    });
  });

  it("names the workspace for an internally published dashboard", () => {
    const spans = buildShareSummary({ ...base, publication: "workspace" });
    expect(spans.at(-2)).toEqual({
      kind: "pill",
      label: "Acme",
      variant: "workspace",
    });
  });

  it("warns that the people list stops governing reads once public", () => {
    const spans = buildShareSummary({ ...base, publication: "public" });
    expect(
      spans
        .map((span) => {
          return span.kind === "text" ? span.text : "";
        })
        .join(""),
    ).toContain("anyone with the link can view it");
  });
});
