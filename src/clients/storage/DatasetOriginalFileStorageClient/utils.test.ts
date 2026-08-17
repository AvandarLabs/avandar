import { describe, expect, it } from "vitest";
import { getDatasetOriginalFileStoragePath } from "@/clients/storage/DatasetOriginalFileStorageClient/utils";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";
import type { Workspace } from "$/models/Workspace/Workspace";

const WORKSPACE_ID = "11111111-1111-4111-8111-111111111111" as Workspace.Id;
const DATASET_ID = "22222222-2222-4222-8222-222222222222" as DatasetId;

describe("getDatasetOriginalFileStoragePath", () => {
  it("builds the original-file object path under the workspace's datasets", () => {
    expect(
      getDatasetOriginalFileStoragePath({
        workspaceId: WORKSPACE_ID,
        datasetId: DATASET_ID,
        fileExtension: "pdf",
      }),
    ).toBe(`${WORKSPACE_ID}/datasets/${DATASET_ID}.original.pdf`);
  });

  it("lowercases the extension so the path is stable regardless of what the browser reported", () => {
    expect(
      getDatasetOriginalFileStoragePath({
        workspaceId: WORKSPACE_ID,
        datasetId: DATASET_ID,
        fileExtension: "PDF",
      }),
    ).toBe(`${WORKSPACE_ID}/datasets/${DATASET_ID}.original.pdf`);
  });

  it("strips a leading dot so '.pdf' and 'pdf' produce the same path", () => {
    expect(
      getDatasetOriginalFileStoragePath({
        workspaceId: WORKSPACE_ID,
        datasetId: DATASET_ID,
        fileExtension: ".pdf",
      }),
    ).toBe(`${WORKSPACE_ID}/datasets/${DATASET_ID}.original.pdf`);
  });

  it("throws a clear error mentioning the extension when it is too long for the SQL regex", () => {
    expect(() =>
      getDatasetOriginalFileStoragePath({
        workspaceId: WORKSPACE_ID,
        datasetId: DATASET_ID,
        fileExtension: "abcdefghijk",
      }),
    ).toThrow(/abcdefghijk/);
  });

  it("throws a clear error for an empty extension", () => {
    expect(() =>
      getDatasetOriginalFileStoragePath({
        workspaceId: WORKSPACE_ID,
        datasetId: DATASET_ID,
        fileExtension: "",
      }),
    ).toThrow(/extension/i);
  });
});
