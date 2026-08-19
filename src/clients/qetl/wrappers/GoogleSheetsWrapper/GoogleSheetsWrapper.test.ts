/**
 * Tests that Google Sheets still refuses, and stays declared as unsound to
 * fetch partially.
 */

import { describe, expect, it } from "vitest";
import { createGoogleSheetsWrapper } from "@/clients/qetl/wrappers/GoogleSheetsWrapper/GoogleSheetsWrapper";
import type { ILogger } from "@avandar/logger";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { RelationRef } from "$/models/relations/RelationRef/RelationRef";
import type { Workspace } from "$/models/Workspace/Workspace";

const DATASET_REF = {
  kind: "dataset",
  id: "44444444-4444-4444-8444-444444444444" as Dataset.Id,
} as const satisfies RelationRef.T;

const CONTEXT = {
  workspaceId: "99999999-9999-4999-8999-999999999999" as Workspace.Id,
  logger: console as unknown as ILogger,
};

describe("GoogleSheetsWrapper", () => {
  it("refuses to acquire, preserving today's behaviour", async () => {
    const wrapper = createGoogleSheetsWrapper();

    await expect(
      wrapper.acquire!({ ref: DATASET_REF, columns: "all" }, CONTEXT),
    ).rejects.toThrow("Google Sheets data fetching is not supported yet");
  });

  it("refuses to describe, preserving today's behaviour", async () => {
    const wrapper = createGoogleSheetsWrapper();

    await expect(wrapper.describe(DATASET_REF, CONTEXT)).rejects.toThrow(
      "Google Sheets extraction is not supported yet",
    );
  });

  // A deliberate change detector, and the only capability assertion here. This
  // trio is what makes stitching two partial Sheets fetches into one relation
  // unsound: no filter can reduce a fetch, no row can be re-identified across
  // fetches, and two calls do not share a snapshot. Anyone relaxing one of
  // these is changing a soundness argument, so the change should not be silent.
  it("keeps declaring the combination that makes partial acquisition unsound", () => {
    const { capabilities } = createGoogleSheetsWrapper();

    expect(capabilities.predicatePushdown).toBe("none");
    expect(capabilities.rowIdentity).toBe("none");
    expect(capabilities.multiCallAtomicity).toBe(false);
    expect(capabilities.quotaScope).toEqual({
      kind: "project-global",
      readsPerMinute: 300,
    });
  });
});
