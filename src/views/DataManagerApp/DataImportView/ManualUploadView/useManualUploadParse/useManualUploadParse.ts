import { MIMEType } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { useEffect, useRef, useState } from "react";
import { uuid } from "$/lib/uuid";
import { DatasetSource } from "$/models/datasets/DatasetSource/DatasetSource";
import { LocalDatasetClient } from "@/clients/datasets/LocalDatasetClient/LocalDatasetClient";
import { notifyError } from "@/utils/notifications/notify";
import { ManualUploadDataSourceMetadata } from "@/views/DataManagerApp/DataImportView/DatasetImportForm/DatasetImportForm.types";
import { useLoadManualUploadFile } from "@/views/DataManagerApp/DataImportView/ManualUploadView/useLoadManualUploadFile/useLoadManualUploadFile";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { UnknownRow } from "@/clients/DuckDbClient/DuckDbClient";
import type { FileParseOptions } from "@/views/DataManagerApp/DataImportView/DatasetImportForm/useSaveDataset/useSaveDataset";
import type { ParseManualFileOptions } from "@/views/DataManagerApp/DataImportView/ManualUploadView/useLoadManualUploadFile/useLoadManualUploadFile";

type LoadFile = ReturnType<typeof useLoadManualUploadFile>["loadFile"];

type FileParseRequest = {
  file: File;
  newDatasetId: Dataset.Id;
  datasetIdToDrop?: Dataset.Id;
  parseOptions?: ParseManualFileOptions;
};

type RequestFileParseParams = FileParseRequest & {
  loadFile: LoadFile;
  setUploadedFile: (file: File) => void;
};

type ReparseManualUploadParams = {
  uploadedFile: File | undefined;
  dataSourceMetadata: ManualUploadDataSourceMetadata | undefined;
  parseOptionsFromForm: FileParseOptions;
  requestFileParse: (params: Readonly<FileParseRequest>) => Promise<void>;
  setIsReparsePending: (isPending: boolean) => void;
};

type SubmitManualUploadFileParams = {
  file: File | undefined;
  requestFileParse: (params: Readonly<FileParseRequest>) => Promise<void>;
  noFileTitle: string;
  noFileMessage: string;
};

/**
 * Parse, reparse, and preview state for the manual spreadsheet upload
 * view.
 */
export type ManualUploadParse = {
  uploadedFile: File | undefined;
  previewRows: UnknownRow[] | undefined;
  dataSourceMetadata: ManualUploadDataSourceMetadata | undefined;
  setDataSourceMetadata: (
    metadata: ManualUploadDataSourceMetadata | undefined,
  ) => void;
  isLoadingFile: boolean;
  isReparsePending: boolean;
  onFileSubmit: (file: File | undefined) => void;
  onRequestDataReparse: (parseOptions: FileParseOptions) => Promise<void>;
};

function _fileMimeTypeToSourceType(
  file: File,
): "csv_file" | "xlsx_file" | "pdf_file" {
  const lowerFileName = file.name.toLowerCase();

  if (file.type.startsWith("text/csv") || lowerFileName.endsWith(".csv")) {
    return "csv_file";
  }

  if (
    file.type === MIMEType.APPLICATION_OPENXML_EXCEL ||
    file.type === MIMEType.APPLICATION_MS_EXCEL ||
    lowerFileName.endsWith(".xlsx")
  ) {
    return "xlsx_file";
  }

  if (
    file.type === MIMEType.APPLICATION_PDF ||
    lowerFileName.endsWith(".pdf")
  ) {
    return "pdf_file";
  }

  if (lowerFileName.endsWith(".xlsx")) {
    return "xlsx_file";
  }

  throw new Error(`Unsupported file type: ${file.type}`);
}

async function _requestFileParse(
  params: Readonly<RequestFileParseParams>,
): Promise<void> {
  const { file, newDatasetId, datasetIdToDrop, loadFile, setUploadedFile } =
    params;
  setUploadedFile(file);
  const parseOptionsToUse = params.parseOptions ?? {
    type: _fileMimeTypeToSourceType(file),
  };
  if (datasetIdToDrop) {
    await LocalDatasetClient.dropLocalDataset({ datasetId: datasetIdToDrop });
  }
  await loadFile.async({
    ...parseOptionsToUse,
    file,
    datasetId: newDatasetId,
  });
}

async function _reparseManualUpload(
  params: Readonly<ReparseManualUploadParams>,
): Promise<void> {
  const {
    uploadedFile,
    dataSourceMetadata,
    parseOptionsFromForm,
    requestFileParse,
    setIsReparsePending,
  } = params;
  if (
    !uploadedFile ||
    !dataSourceMetadata ||
    !DatasetSource.isManuallyUploadable(parseOptionsFromForm)
  ) {
    return;
  }
  setIsReparsePending(true);
  try {
    await requestFileParse({
      file: uploadedFile,
      datasetIdToDrop: dataSourceMetadata.datasetLoadResult.datasetId,
      newDatasetId: uuid() as Dataset.Id,
      parseOptions: parseOptionsFromForm,
    });
  } finally {
    setIsReparsePending(false);
  }
}

function _submitManualUploadFile(
  options: Readonly<SubmitManualUploadFileParams>,
): void {
  const { file, requestFileParse, noFileTitle, noFileMessage } = options;
  if (file) {
    void requestFileParse({ file, newDatasetId: uuid() as Dataset.Id });
    return;
  }
  notifyError({
    title: noFileTitle,
    message: noFileMessage,
  });
}

function useAutoParseInitialFile(
  initialFile: File | undefined,
  requestFileParse: (params: Readonly<FileParseRequest>) => Promise<void>,
): void {
  const hasAutoParsedInitialFileRef = useRef(false);
  useEffect(
    function autoParseInitialFile() {
      if (!initialFile || hasAutoParsedInitialFileRef.current) {
        return;
      }
      hasAutoParsedInitialFileRef.current = true;
      void requestFileParse({
        file: initialFile,
        newDatasetId: uuid() as Dataset.Id,
      });
    },
    // We intentionally exclude `requestFileParse` from deps - it changes
    // on every render but the ref guards single execution.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [initialFile],
  );
}

/**
 * Owns sniffing a dropped or chosen spreadsheet and re-parsing it on
 * demand.
 */
export function useManualUploadParse(
  initialFile: File | undefined,
): ManualUploadParse {
  const { t } = useLingui();
  const [uploadedFile, setUploadedFile] = useState<File | undefined>();
  const [isReparsePending, setIsReparsePending] = useState(false);
  const manualFileLoad = useLoadManualUploadFile();

  const requestFileParse = (
    params: Readonly<FileParseRequest>,
  ): Promise<void> => {
    return _requestFileParse({
      ...params,
      loadFile: manualFileLoad.loadFile,
      setUploadedFile,
    });
  };

  useAutoParseInitialFile(initialFile, requestFileParse);

  return {
    uploadedFile,
    previewRows: manualFileLoad.previewRows,
    dataSourceMetadata: manualFileLoad.dataSourceMetadata,
    setDataSourceMetadata: manualFileLoad.setDataSourceMetadata,
    isLoadingFile: manualFileLoad.isLoadingFile,
    isReparsePending,
    onFileSubmit: (file) => {
      _submitManualUploadFile({
        file,
        requestFileParse,
        noFileTitle: t`No file selected`,
        noFileMessage: t`Please select a file to import`,
      });
    },
    onRequestDataReparse: (parseOptionsFromForm) => {
      return _reparseManualUpload({
        uploadedFile,
        dataSourceMetadata: manualFileLoad.dataSourceMetadata,
        parseOptionsFromForm,
        requestFileParse,
        setIsReparsePending,
      });
    },
  };
}
