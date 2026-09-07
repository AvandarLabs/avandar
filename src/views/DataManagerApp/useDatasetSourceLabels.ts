import { useLingui } from "@lingui/react/macro";
import { useMemo } from "react";
import type { DatasetSource } from "$/models/datasets/DatasetSource/DatasetSource";

/**
 * The user-facing name of every dataset source type, keyed by the stored
 * enum value. Used wherever a single dataset's origin is named in a
 * sentence or a fact line.
 */
export function useDatasetSourceLabels(): Record<
  DatasetSource.SourceType,
  string
> {
  const { t } = useLingui();
  return useMemo(() => {
    return {
      csv_file: t`CSV file`,
      google_sheets: t`Google Sheets`,
      open_data: t`Open data`,
      pdf_file: t`PDF file`,
      virtual: t`Derived dataset`,
      xlsx_file: t`Excel file`,
    };
  }, [t]);
}

/**
 * The short form used to head a run of datasets from the same source.
 *
 * A heading sits over a list, so it drops the singular noun the fact-line
 * label carries: "CSV" over three files rather than "CSV file".
 */
export function useDatasetSourceGroupLabels(): Record<
  DatasetSource.SourceType,
  string
> {
  const { t } = useLingui();
  return useMemo(() => {
    return {
      csv_file: t`CSV`,
      google_sheets: t`Google Sheets`,
      open_data: t`Open data`,
      pdf_file: t`PDF`,
      virtual: t`Derived`,
      xlsx_file: t`Excel`,
    };
  }, [t]);
}
