import type { Dataset } from "$/models/datasets/Dataset/Dataset";

/**
 * Why a dataset delete did not go through.
 * - `not_allowed`: the current user is not an admin of the dataset, so nothing
 *   was deleted.
 * - `still_present`: the delete ran but the dataset row is still there, as
 *   happens when row level security refuses a delete without raising an error.
 */
export type DatasetDeleteErrorReason = "not_allowed" | "still_present";

/**
 * Thrown by `DatasetClient.fullDelete` when a dataset was not deleted. A
 * caller that shows the failure checks `instanceof` and translates `reason`
 * into copy; the message is for logs only.
 */
export class DatasetDeleteError extends Error {
  readonly reason: DatasetDeleteErrorReason;
  readonly datasetId: Dataset.Id;

  /** Creates an error naming the dataset and why it was not deleted. */
  constructor(
    options: Readonly<{
      datasetId: Dataset.Id;
      reason: DatasetDeleteErrorReason;
    }>,
  ) {
    super(
      options.reason === "not_allowed"
        ? `Dataset '${options.datasetId}' cannot be deleted by the current user.`
        : `Dataset '${options.datasetId}' is still present after its delete.`,
    );
    this.name = "DatasetDeleteError";
    this.reason = options.reason;
    this.datasetId = options.datasetId;
  }
}
