import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";
import type { Workspace } from "$/models/Workspace/Workspace";

import { describe, expect, it } from "vitest";

import { makeDatasetOriginalFileStoragePathFromIds } from "@/clients/storage/DatasetOriginalFileStorageClient/makeDatasetOriginalFileStoragePathFromIds/makeDatasetOriginalFileStoragePathFromIds";

const WORKSPACE_ID = "11111111-1111-4111-8111-111111111111" as Workspace.Id;
const DATASET_ID = "22222222-2222-4222-8222-222222222222" as DatasetId;

describe("makeDatasetOriginalFileStoragePathFromIds", () => {
  it("builds the original-file object path under the workspace's datasets", () => {
    expect(
      makeDatasetOriginalFileStoragePathFromIds({
        workspaceId: WORKSPACE_ID,
        datasetId: DATASET_ID,
        fileExtension: "pdf",
      }),
    ).toBe(`${WORKSPACE_ID}/datasets/${DATASET_ID}.original.pdf`);
  });

  it("lowercases the extension so the path is stable regardless of what the browser reported", () => {
    expect(
      makeDatasetOriginalFileStoragePathFromIds({
        workspaceId: WORKSPACE_ID,
        datasetId: DATASET_ID,
        fileExtension: "PDF",
      }),
    ).toBe(`${WORKSPACE_ID}/datasets/${DATASET_ID}.original.pdf`);
  });

  it("strips a leading dot so '.pdf' and 'pdf' produce the same path", () => {
    expect(
      makeDatasetOriginalFileStoragePathFromIds({
        workspaceId: WORKSPACE_ID,
        datasetId: DATASET_ID,
        fileExtension: ".pdf",
      }),
    ).toBe(`${WORKSPACE_ID}/datasets/${DATASET_ID}.original.pdf`);
  });

  it("throws a clear error mentioning the extension when it is too long for the SQL regex", () => {
    expect(() => {
      return makeDatasetOriginalFileStoragePathFromIds({
        workspaceId: WORKSPACE_ID,
        datasetId: DATASET_ID,
        fileExtension: "abcdefghijk",
      });
    }).toThrow(/abcdefghijk/);
  });

  it("throws a clear error for an empty extension", () => {
    expect(() => {
      return makeDatasetOriginalFileStoragePathFromIds({
        workspaceId: WORKSPACE_ID,
        datasetId: DATASET_ID,
        fileExtension: "",
      });
    }).toThrow(/extension/i);
  });
});
