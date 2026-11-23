import { Stack } from "@mantine/core";
import { DatasetPreviewBlock } from "@/components/DatasetPreviewBlock/DatasetPreviewBlock";
import { AppViewSection } from "@/components/layouts/AppView/AppViewSection/AppViewSection";
import { DatasetImportActions } from "@/views/DataManagerApp/DataImportView/DatasetImportForm/DatasetImportActions/DatasetImportActions";
import { DatasetImportFields } from "@/views/DataManagerApp/DataImportView/DatasetImportForm/DatasetImportFields";
import { DatasetParseOptionsBar } from "@/views/DataManagerApp/DataImportView/DatasetImportForm/DatasetParseOptionsBar/DatasetParseOptionsBar";
import { cases, columns, metadata } from "../importFixtures";
import type { useImportReview } from "./useImportReview";
import type { DatasetImportValidation } from "@/views/DataManagerApp/DataImportView/DatasetImportForm/useDatasetImportValidation";
import type { ReactNode } from "react";

type Props = Pick<
  ReturnType<typeof useImportReview>,
  "nameRef" | "descriptionRef" | "copy" | "form"
> & { frame: number };
const _noop = () => {};
const validation = {
  isFormErrorSummaryVisible: false,
  formErrorSummaryItems: [],
} as unknown as DatasetImportValidation;
/**
 * Present dataset details, preview and native save actions for a typed import.
 */
export function ImportReviewFields({
  nameRef,
  descriptionRef,
  copy,
  form,
  frame,
}: Readonly<Props>): ReactNode {
  return (
    <Stack gap="xl">
      <AppViewSection title="Dataset details">
        <DatasetImportFields
          nameInputRef={nameRef}
          descriptionInputRef={descriptionRef}
          nameLabel="Dataset name"
          namePlaceholder="Enter a name for this dataset"
          descriptionLabel="Description"
          descriptionPlaceholder="What is in this dataset?"
          form={form}
        />
      </AppViewSection>
      <DatasetPreviewBlock
        columns={columns}
        previewRows={cases.slice(0, 200)}
        previewMeta={copy.previewMeta}
        columnsMeta={copy.columnsMeta}
        previewControls={
          <DatasetParseOptionsBar
            dataSourceMetadata={metadata}
            isProcessing={false}
            onDataSourceMetadataChange={_noop}
            onRequestDataReparse={_noop}
          />
        }
      />
      <DatasetImportActions
        {...{ copy, validation }}
        dataSourceMetadata={metadata}
        disableSubmit={false}
        isOfflineBlocked={false}
        isSavePending={frame >= 424}
        onDataSourceMetadataChange={_noop}
      />
    </Stack>
  );
}
