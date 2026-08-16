import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";

/** Every localised sentence the import feedback section may show. */
export type DatasetImportCopy = {
  columnsMessage: string;
  errorMessage: string;
  errorTitle: string;
  failureMessage: string;
  failureTitle: string;
  offlineOnlyTitle: string;
  previewMessage: string;
  successMessage: string;
  successTitle: string;
};

/**
 * The import feedback copy, localised here so the presentational components
 * below take plain strings.
 *
 * The row count goes through the `plural` macro rather than
 * `Number.toLocaleString()`: the ICU `#` formats the number in the ACTIVE
 * locale (`toLocaleString()` with no argument formats in the browser's, inside
 * an otherwise translated sentence), and it lets each locale supply its own
 * forms instead of hard-coding the English plural.
 */
export function useDatasetImportCopy(
  options: Readonly<{
    numColumns: number;
    numPreviewRows: number;
    numRows: number;
  }>,
): DatasetImportCopy {
  const { t } = useLingui();
  return {
    columnsMessage: t`${options.numColumns} columns were detected. Review the column info below to make sure they are correct. If they are not, change the import options above and click Upload again.`,
    errorMessage: t`Scroll up to the fields above, or use the list below.`,
    errorTitle: t`Fix these issues before saving`,
    failureMessage: t`No rows were read successfully`,
    failureTitle: t`Data processing failed`,
    offlineOnlyTitle: t`This dataset will be offline-only`,
    previewMessage: t`These are the first ${options.numPreviewRows} rows of your dataset. Check to see if the data is correct. If they are not, it's possible your dataset does not start on the first row or the CSV uses a different delimiter. Try adjusting those settings here.`,
    successMessage: t`Parsed ${plural(options.numRows, {
      one: "# row",
      other: "# rows",
    })} successfully`,
    successTitle: t`Data processed successfully`,
  };
}
