import { formatDate, formatFileSize, isNonNullish } from "@avandar/utils";
import { Trans, useLingui } from "@lingui/react/macro";
import { match } from "ts-pattern";
import { AppViewRail } from "@/components/layouts/AppView/AppViewRail/AppViewRail";
import type { CsvFileDataset } from "$/models/datasets/CsvFileDataset/CsvFileDataset";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { GoogleSheetsDataset } from "$/models/datasets/GoogleSheetsDataset/GoogleSheetsDataset";
import type { OpenDataDataset } from "$/models/datasets/OpenDataDataset/OpenDataDataset";
import type { PdfFileDataset } from "$/models/datasets/PdfFileDataset/PdfFileDataset";
import type { VirtualDataset } from "$/models/datasets/VirtualDataset/VirtualDataset";
import type { XlsxFileDataset } from "$/models/datasets/XlsxFileDataset/XlsxFileDataset";
import type { ReactNode } from "react";

export type DatasetSourceRecord =
  | CsvFileDataset.T
  | GoogleSheetsDataset.T
  | OpenDataDataset.T
  | PdfFileDataset.T
  | VirtualDataset.T
  | XlsxFileDataset.T;

type Props = {
  dataset: Dataset.T;
  source: DatasetSourceRecord | undefined;
};

/**
 * The provenance of a dataset: how it was read, and where the bytes live.
 *
 * These are reference material: true, occasionally load-bearing, and never
 * the reason someone opened the page, which is why they sit in the rail. Do
 * not promote them to rows in the main column, where they carry the same
 * weight as the dataset's own name and turn a detail page into a dump of a
 * database row.
 *
 * A fact with no value is omitted rather than shown empty. "Quote char:
 * empty text" tells a user nothing they did not already know.
 */
export function DatasetSourceRail({
  dataset,
  source,
}: Readonly<Props>): ReactNode {
  const { t, i18n } = useLingui();

  const yesNo = (value: boolean): string => {
    return value ? t`Yes` : t`No`;
  };

  const optionalFact = (label: string, value: unknown): ReactNode => {
    if (!isNonNullish(value) || value === "") {
      return null;
    }
    return <AppViewRail.Fact label={label}>{String(value)}</AppViewRail.Fact>;
  };

  const sourceFacts = match(source)
    .with({ __type: "CsvFileDataset" }, (csv) => {
      return (
        <>
          <AppViewRail.Fact label={t`File size`}>
            {formatFileSize(csv.sizeInBytes, { locale: i18n.locale })}
          </AppViewRail.Fact>
          <AppViewRail.Fact label={t`Delimiter`}>
            {csv.delimiter === " " ? t`Space` : csv.delimiter}
          </AppViewRail.Fact>
          <AppViewRail.Fact label={t`Header row`}>
            {yesNo(csv.hasHeader)}
          </AppViewRail.Fact>
          {csv.rowsToSkip > 0
            ? optionalFact(t`Rows skipped`, csv.rowsToSkip)
            : null}
          {optionalFact(t`Date format`, csv.dateFormat)}
          {optionalFact(t`Time format`, csv.timestampFormat)}
        </>
      );
    })
    .with({ __type: "XlsxFileDataset" }, (xlsx) => {
      return (
        <>
          <AppViewRail.Fact label={t`File size`}>
            {formatFileSize(xlsx.sizeInBytes, { locale: i18n.locale })}
          </AppViewRail.Fact>
          {optionalFact(t`Sheet`, xlsx.sheetName)}
          <AppViewRail.Fact label={t`Header row`}>
            {yesNo(xlsx.hasHeader)}
          </AppViewRail.Fact>
          {xlsx.rowsToSkip > 0
            ? optionalFact(t`Rows skipped`, xlsx.rowsToSkip)
            : null}
          {optionalFact(t`Date format`, xlsx.dateFormat)}
          {optionalFact(t`Time format`, xlsx.timestampFormat)}
        </>
      );
    })
    .with({ __type: "PdfFileDataset" }, (pdf) => {
      return (
        <>
          <AppViewRail.Fact label={t`File size`}>
            {formatFileSize(pdf.sizeInBytes, { locale: i18n.locale })}
          </AppViewRail.Fact>
          <AppViewRail.Fact label={t`Regions read`}>
            {pdf.regions.length}
          </AppViewRail.Fact>
          <AppViewRail.Fact label={t`Original kept`}>
            {yesNo(pdf.hasOriginalFile)}
          </AppViewRail.Fact>
        </>
      );
    })
    .with({ __type: "GoogleSheetsDataset" }, (sheet) => {
      return (
        <>
          {optionalFact(t`Tab`, sheet.sheetName)}
          {sheet.rowsToSkip > 0
            ? optionalFact(t`Rows skipped`, sheet.rowsToSkip)
            : null}
        </>
      );
    })
    // Exhaustive rather than `.otherwise`: a source type added to
    // `DatasetSourceRecord` should fail to compile here instead of silently
    // rendering a rail with no provenance in it.
    .with(undefined, () => {
      return null;
    })
    .with({ __type: "OpenDataDataset" }, { __type: "VirtualDataset" }, () => {
      return null;
    })
    .exhaustive();

  const storageFact =
    source && "isInCloudStorage" in source ? (
      <AppViewRail.Fact label={t`Storage`}>
        {source.isInCloudStorage ? (
          <Trans>Synced to the cloud</Trans>
        ) : (
          <Trans>This computer only</Trans>
        )}
      </AppViewRail.Fact>
    ) : null;

  return (
    <AppViewRail>
      <AppViewRail.Group title={<Trans>Source</Trans>}>
        {sourceFacts}
        {storageFact}
        <AppViewRail.Fact label={t`Added`}>
          {formatDate(dataset.createdAt, { format: "MMM D, YYYY" })}
        </AppViewRail.Fact>
        {dataset.dateOfLastSync
          ? optionalFact(
              t`Last synced`,
              formatDate(dataset.dateOfLastSync, { format: "MMM D, YYYY" }),
            )
          : null}
        {dataset.isRestricted ? (
          <AppViewRail.Fact label={t`Access`}>
            <Trans>Restricted</Trans>
          </AppViewRail.Fact>
        ) : null}
      </AppViewRail.Group>
    </AppViewRail>
  );
}
