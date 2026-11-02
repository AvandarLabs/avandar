import { useLingui } from "@lingui/react/macro";

/** Every localised sentence the import feedback section may show. */
export type DatasetImportCopy = {
  columnsMeta: string;
  errorMessage: string;
  errorTitle: string;
  failureMessage: string;
  failureTitle: string;
  offlineOnlyTitle: string;
  previewMeta: string;
};

/**
 * The import feedback copy, localised here so the presentational components
 * below take plain strings.
 *
 * The two lines beside the section headings are counts, not instructions.
 * What to do when the numbers look wrong is answered by the parse settings
 * sitting directly above the grid, which is a better answer than a
 * paragraph explaining that they exist.
 */
export function useDatasetImportCopy(
  options: Readonly<{
    numColumns: number;
    numPreviewRows: number;
  }>,
): DatasetImportCopy {
  const { t } = useLingui();
  return {
    columnsMeta: t`${options.numColumns} detected`,
    errorMessage: t`Fix the fields above, then save.`,
    errorTitle: t`Fix these issues before saving`,
    failureMessage: t`No rows were read successfully. Adjust the parse settings below, or check that the file is not empty.`,
    failureTitle: t`Data processing failed`,
    offlineOnlyTitle: t`This dataset will be offline-only`,
    previewMeta: t`First ${options.numPreviewRows} rows`,
  };
}
