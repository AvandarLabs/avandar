import { Stack } from "@mantine/core";
import { useLayoutEffect, useMemo, useRef } from "react";
import { DatasetPreviewBlock } from "@/components/DatasetPreviewBlock/DatasetPreviewBlock";
import { AppViewSection } from "@/components/layouts/AppView/AppViewSection/AppViewSection";
import { DatasetImportActions } from "@/views/DataManagerApp/DataImportView/DatasetImportForm/DatasetImportActions/DatasetImportActions";
import { DatasetImportFields } from "@/views/DataManagerApp/DataImportView/DatasetImportForm/DatasetImportFields";
import { DatasetParseOptionsBar } from "@/views/DataManagerApp/DataImportView/DatasetImportForm/DatasetParseOptionsBar/DatasetParseOptionsBar";
import { useDatasetImportCopy } from "@/views/DataManagerApp/DataImportView/DatasetImportForm/useDatasetImportCopy";
import { UploadedFileBar } from "@/views/DataManagerApp/DataImportView/ManualUploadView/UploadedFileBar/UploadedFileBar";
import { enter, typed } from "../../src/motion";
import { cases, columns, DESCRIPTION, metadata, NAME } from "./importFixtures";
import type { DatasetImportValidation } from "@/views/DataManagerApp/DataImportView/DatasetImportForm/useDatasetImportValidation";
import type { ComponentProps } from "react";

const _noop = () => {};

const validation = {
  isFormErrorSummaryVisible: false,
  formErrorSummaryItems: [],
} as unknown as DatasetImportValidation;

/** The real import review form: the product's dataset-detail fields and preview, typed out frame by frame. */
export function ImportReview({ frame }: { frame: number }) {
  const nameRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLFormElement>(null);
  const file = useMemo(
    () => new File([new Uint8Array(26703)], "cases.csv", { type: "text/csv" }),
    [],
  );
  const copy = useDatasetImportCopy({
    numColumns: columns.length,
    numPreviewRows: 200,
  });
  const name = frame < 128 ? "cases.csv" : typed(frame, 128, NAME, 24);
  const description = typed(frame, 209, DESCRIPTION, 34);
  const form = {
    key: (field: string) => field,
    getInputProps: (field: string) => ({
      value: field === "name" ? name : description,
      readOnly: true,
      "data-video-target": `import-${field}`,
      styles: {
        input: {
          borderColor:
            (field === "name" && frame >= 124 && frame < 205) ||
            (field === "description" && frame >= 205 && frame < 330)
              ? "var(--mantine-color-primary-6)"
              : undefined,
        },
      },
    }),
  } as unknown as ComponentProps<typeof DatasetImportFields>["form"];
  useLayoutEffect(() => {
    rootRef.current
      ?.querySelector('button[type="submit"]')
      ?.setAttribute("data-video-target", "import-save");
  });
  return (
    <Stack gap="xl" style={enter(frame, 68, { y: 10, dur: 18 })}>
      <UploadedFileBar
        file={file}
        sourceType="csv_file"
        isBusy={false}
        onReplace={_noop}
      />
      <form ref={rootRef} onSubmit={(event) => event.preventDefault()}>
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
            copy={copy}
            dataSourceMetadata={metadata}
            disableSubmit={false}
            isOfflineBlocked={false}
            isSavePending={frame >= 424}
            onDataSourceMetadataChange={_noop}
            validation={validation}
          />
        </Stack>
      </form>
    </Stack>
  );
}
