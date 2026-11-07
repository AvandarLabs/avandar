import { useLingui } from "@lingui/react/macro";
import { useMemo } from "react";
import type { DatasetSource } from "$/models/datasets/DatasetSource/DatasetSource";

/**
 * The translated name of each dataset source type, keyed by the stored enum
 * value. Use it wherever a dataset's origin is shown to users, for example
 * in a dataset's page header or on a card that references a dataset.
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
      postgres_table: t`Database`,
      virtual: t`Derived dataset`,
      xlsx_file: t`Excel file`,
    };
  }, [t]);
}
