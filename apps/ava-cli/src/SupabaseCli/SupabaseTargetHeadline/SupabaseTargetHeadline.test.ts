import { SupabaseTargetHeadline } from "@ava-cli/SupabaseCli/SupabaseTargetHeadline/SupabaseTargetHeadline";
import { describe, expect, it } from "vitest";
import type { SupabaseSwitchSummary } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseLocalEnvironment.types";

const SHARED_SUMMARY: SupabaseSwitchSummary = {
  branch: "develop",
  switchKind: "shared",
  projectId: "avandar",
  sharedProjectId: "avandar",
  remoteApiUrl: undefined,
  hasStrayOverride: false,
  isExpectedForBranch: true,
  config: { projectId: "avandar", apiPort: 54321, ports: {} },
};

describe("SupabaseTargetHeadline.makeLines", () => {
  it("names the develop local Supabase in green for an unswitched branch", () => {
    expect(
      SupabaseTargetHeadline.makeLines({ summary: SHARED_SUMMARY }),
    ).toEqual([
      {
        style: "success",
        text: "✅ This is the develop local Supabase (avandar). Branch develop uses it.",
      },
    ]);
  });

  it("warns in yellow that a branch is on a switched local Supabase", () => {
    expect(
      SupabaseTargetHeadline.makeLines({
        summary: {
          ...SHARED_SUMMARY,
          branch: "feat/x",
          switchKind: "local",
          projectId: "feat-x",
        },
      }),
    ).toEqual([
      {
        style: "warning",
        text: "⚠️  Branch feat/x is on a switched local Supabase database: feat-x.",
      },
    ]);
  });

  it("warns in yellow that a branch is switched to a hosted project", () => {
    expect(
      SupabaseTargetHeadline.makeLines({
        summary: {
          ...SHARED_SUMMARY,
          branch: "feat/x",
          switchKind: "remote",
          projectId: "abcdefghijklmnopqrst",
          remoteApiUrl: "https://abcdefghijklmnopqrst.supabase.co",
        },
      }),
    ).toEqual([
      {
        style: "warning",
        text: "⚠️  Branch feat/x is switched to a remote Supabase database: abcdefghijklmnopqrst (https://abcdefghijklmnopqrst.supabase.co).",
      },
    ]);
  });

  it("adds a warning when .env.development holds overrides no switch wrote", () => {
    const lines = SupabaseTargetHeadline.makeLines({
      summary: {
        ...SHARED_SUMMARY,
        branch: "feat/x",
        projectId: "feat-other",
        hasStrayOverride: true,
      },
    });

    expect(lines).toHaveLength(2);
    expect(lines[1]).toEqual(
      expect.objectContaining({
        style: "warning",
        text: expect.stringContaining("no switch on branch feat/x wrote"),
      }),
    );
  });
});
