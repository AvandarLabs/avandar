import type { Dataset } from "$/models/datasets/Dataset/Dataset";

/**
 * Why the place tool cannot edit a dataset's places.
 * - `not_places_dataset`: the dataset was never created as a places dataset.
 * - `rows_not_places`: it was, but its stored SQL no longer returns the places
 *   columns, for example after someone rewrote it in the Data Explorer.
 */
export type PlacesNotEditableReason = "not_places_dataset" | "rows_not_places";

/**
 * Thrown by a places store when a dataset's places cannot be read or rewritten
 * by the place tool. A component checks `instanceof` and translates `reason`
 * into copy; the message is for logs only.
 */
export class PlacesNotEditableError extends Error {
  readonly reason: PlacesNotEditableReason;
  readonly datasetId: Dataset.Id;

  /** Creates an error naming the dataset and why it is not editable. */
  constructor(
    options: Readonly<{
      datasetId: Dataset.Id;
      reason: PlacesNotEditableReason;
      cause?: unknown;
    }>,
  ) {
    super(
      options.reason === "not_places_dataset"
        ? `Dataset '${options.datasetId}' is not a places dataset.`
        : `Dataset '${options.datasetId}' no longer returns places rows.`,
      { cause: options.cause },
    );
    this.name = "PlacesNotEditableError";
    this.reason = options.reason;
    this.datasetId = options.datasetId;
  }
}
