import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";
import type { Workspace } from "$/models/Workspace/Workspace";

// This must stay in sync with the extension group in the object-name regex
// inside `public.util__storage_object_dataset_id`
// (supabase/schemas/16.utils.resource-permissions.sql): `[A-Za-z0-9]{1,10}`.
// That function is what every `workspaces` bucket RLS policy calls to decide
// whether an object is reachable; if this validation is looser than the SQL
// regex, an upload can succeed here and still be permanently unreachable
// behind RLS, surfacing later as an opaque storage 403 with no useful
// diagnostic. Keep the two in lockstep.
const VALID_EXTENSION_PATTERN = /^[A-Za-z0-9]{1,10}$/;

/**
 * Builds the object-storage path for a dataset's retained original file
 * (e.g. the source PDF a parquet table was extracted from).
 *
 * @param options The options for building the path.
 * @param options.workspaceId The ID of the workspace the dataset belongs to.
 * @param options.datasetId The ID of the dataset the original file belongs
 * to.
 * @param options.fileExtension The original file's extension, with or
 * without a leading dot (e.g. "pdf" or ".pdf"). Matched case-insensitively
 * and normalized to lowercase so the resulting path is stable regardless of
 * what the browser reported.
 * @returns The object-storage path, of the shape
 * `<workspaceId>/datasets/<datasetId>.original.<ext>`.
 */
export function getDatasetOriginalFileStoragePath(options: {
  workspaceId: Workspace.Id;
  datasetId: DatasetId;
  fileExtension: string;
}): string {
  const { workspaceId, datasetId, fileExtension } = options;

  const normalizedExtension = fileExtension
    .replace(/^\./, "")
    .toLowerCase();

  if (!VALID_EXTENSION_PATTERN.test(normalizedExtension)) {
    throw new Error(
      `Invalid file extension "${fileExtension}" for dataset original file. ` +
        "The extension must be 1 to 10 alphanumeric characters to be " +
        "reachable under storage access policies.",
    );
  }

  return `${workspaceId}/datasets/${datasetId}.original.${normalizedExtension}`;
}
