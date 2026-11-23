import type { ConceptFormValues } from "@/views/OntologyDesignerApp/ConceptCreatorView/conceptFormTypes";

/**
 * The form's validation rule for a dataset field's `bucketGrain`. A period
 * needs a date column to place each row in one, so the rule returns
 * `errorMessage` for a field that has a period and no date column, and
 * `null` otherwise. Used by the concept creator's `validate` object, which
 * passes the translated message.
 *
 * The error is stored at the field's `bucketGrain` path, so choosing a period
 * or a date column through `writeFormShapeFields` clears it.
 */
export function createBucketColumnValidator(
  errorMessage: string,
): (
  bucketGrain: ConceptFormValues["datasetColumnAttributes"][number]["bucketGrain"],
  values: ConceptFormValues,
  path: string,
) => string | null {
  return (bucketGrain, values, path) => {
    const attribute =
      values.datasetColumnAttributes[Number(path.split(".")[1])];
    return bucketGrain !== undefined &&
      attribute?.mappings.datasetColumn.bucketColumnId === undefined
      ? errorMessage
      : null;
  };
}
