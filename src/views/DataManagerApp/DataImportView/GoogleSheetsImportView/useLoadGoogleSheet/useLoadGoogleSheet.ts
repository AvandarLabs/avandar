import { useMutation } from "@avandar/query-hooks";
import { formatNumber, MIMEType } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { useCallback, useState } from "react";
import { uuid } from "$/lib/uuid";
import { LocalDatasetClient } from "@/clients/datasets/LocalDatasetClient/LocalDatasetClient";
import { getGoogleSheetXlsxExport } from "@/clients/google/GoogleDriveClient/GoogleDriveClient";
import { useCurrentUser } from "@/hooks/users/useCurrentUser";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { Logger } from "@/utils/Logger";
import { notifyError, notifySuccess } from "@/utils/notifications/notify";
import { getGoogleSheetImportErrorCopy } from "@/views/DataManagerApp/DataImportView/GoogleSheetsImportView/getGoogleSheetImportErrorCopy";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { UserId } from "$/models/User/User.types";
import type { UnknownRow } from "@/clients/DuckDbClient/DuckDbClient";
import type { DuckDbLoadXlsxResult } from "@/clients/DuckDbClient/DuckDbClient.types";
import type { GoogleToken } from "@/lib/hooks/useGooglePickerAPI";
import type { GPickerDocumentObject } from "@/lib/types/google-picker";
import type {
  GoogleSheetsDataSourceMetadata,
  GoogleSheetsLoadResult,
} from "@/views/DataManagerApp/DataImportView/DatasetImportForm/DatasetImportForm.types";
import type {
  FileParseOptions,
  GoogleSheetsParseOptions,
} from "@/views/DataManagerApp/DataImportView/DatasetImportForm/useSaveDataset/useSaveDataset";

/**
 * The exported workbook, kept so a re-parse against a different tab does not
 * re-export from Drive. Every tab lives in these same bytes.
 *
 * This is the Google Sheets counterpart of the manual upload path's retained
 * `File`: the source bytes a re-parse reads again.
 */
export type ExportedWorkbook = {
  xlsxBytes: Uint8Array<ArrayBuffer>;
  spreadsheetName: string;
};

type GoogleSheetsLoadOptions = {
  datasetId: Dataset.Id;
  googleAccountId: string;
  documentId: string;
  xlsxBytes: Uint8Array<ArrayBuffer>;
  spreadsheetName: string;
};

type GoogleSheetParseRequest = {
  documentId: GPickerDocumentObject["id"];
  googleAccountId: string;
  workbook: ExportedWorkbook;
  newDatasetId: Dataset.Id;
  datasetIdToDrop?: Dataset.Id;
  parseOptions?: GoogleSheetsParseOptions;
};

/**
 * Export, parse, reparse, and preview state for the Google Sheets import
 * view.
 *
 * Deliberately the same shape as `ManualUploadParse`, so both import views
 * read the same way: the retained source (`exportedWorkbook` here, the
 * uploaded `File` there), the rows the sniff produced, the metadata the form
 * saves from, and the callbacks the view hands to its source picker and its
 * form. See `../../README.md` for the shape both views follow.
 */
export type GoogleSheetLoad = {
  selectedDocument: GPickerDocumentObject | undefined;
  exportedWorkbook: ExportedWorkbook | undefined;
  previewRows: UnknownRow[] | undefined;
  dataSourceMetadata: GoogleSheetsDataSourceMetadata | undefined;
  setDataSourceMetadata: (
    metadata: GoogleSheetsDataSourceMetadata | undefined,
  ) => void;

  /** True while the Drive export that precedes the sniff is in flight. */
  isExportingSheet: boolean;

  /**
   * True while the sniff is in flight, for a first pick and a re-parse alike.
   *
   * There is no separate re-parse flag, unlike the manual upload path: a
   * re-parse here goes through this very mutation, because it re-reads the
   * workbook already in hand rather than starting a new request.
   */
  isLoadingSheet: boolean;
  onGoogleSheetPicked: (params: {
    document: GPickerDocumentObject;
    googleAccount: GoogleToken;
  }) => void;
  onPickerCancel: () => void;
  onRequestDataReparse: (parseOptions: FileParseOptions) => Promise<void>;
};

/** Wraps workbook bytes in the `File` the local import mutation takes. */
function _makeWorkbookFile(workbook: Readonly<ExportedWorkbook>): File {
  return new File(
    [new Blob([workbook.xlsxBytes])],
    `${workbook.spreadsheetName}.xlsx`,
    { type: MIMEType.APPLICATION_OPENXML_EXCEL },
  );
}

/**
 * Owns exporting a picked Google Sheet from Drive, sniffing the workbook it
 * returns, and re-parsing that workbook on demand.
 *
 * Two phases, as on the manual upload path:
 *
 *   - The Drive export: `files.export` returns the whole workbook, every tab,
 *     in one call. The bytes are kept so choosing another tab never asks Drive
 *     again.
 *
 *   - The sniff phase (awaited by this hook): `startXlsxImport` produces the
 *     column names, the tab list and a preview, and fires the background
 *     parquet transcoding. `previewRows` comes from that sniff, which is the
 *     only place the rows exist before the dataset is saved.
 *
 * IMPORTANT: this does **not** save the dataset to the backend database;
 * that's `useSaveDataset`.
 */
export function useLoadGoogleSheet(): GoogleSheetLoad {
  const { t, i18n } = useLingui();
  const user = useCurrentUser();
  const workspace = useCurrentWorkspace();
  const [selectedDocument, setSelectedDocument] = useState<
    GPickerDocumentObject | undefined
  >();
  const [dataSourceMetadata, setDataSourceMetadata] = useState<
    GoogleSheetsDataSourceMetadata | undefined
  >();
  const [exportedWorkbook, setExportedWorkbook] = useState<
    ExportedWorkbook | undefined
  >();

  const [exportGoogleSheet, isExportingGoogleSheet] = useMutation({
    mutationFn: async (params: {
      documentId: string;
      googleAccountId: string;
      accessToken: string;
      // Carried as a parameter rather than read from `selectedDocument`. This
      // mutation closes over the render that ran before the pick was recorded,
      // so reading the state gave the first import the placeholder name and
      // every later one the *previous* sheet's name.
      spreadsheetName: string;
    }): Promise<ExportedWorkbook> => {
      // Drive's `files.export` returns the whole workbook, every tab, in one
      // call. The Sheets API is no longer involved: acquisition and import now
      // read the same bytes with the same parser, so a tab name recorded at
      // import is a tab name `read_xlsx` can find, and `drive.file` alone is
      // provably sufficient.
      const { xlsxBytes } = await getGoogleSheetXlsxExport({
        fileId: params.documentId,
        accessToken: params.accessToken,
      });
      return { xlsxBytes, spreadsheetName: params.spreadsheetName };
    },
    onSuccess: (workbook, inputParams) => {
      setExportedWorkbook(workbook);
      requestSheetParse({
        documentId: inputParams.documentId,
        googleAccountId: inputParams.googleAccountId,
        newDatasetId: uuid() as Dataset.Id,
        workbook,
      });
    },
    onError: (error) => {
      Logger.error(error, { devMsg: "Google Sheet export failed" });
      notifyError(getGoogleSheetImportErrorCopy({ error, i18n }));
    },
  });

  // Load the exported workbook into local storage after it has been picked.
  const [loadGoogleSheet, isLoadingGoogleSheet] = useMutation({
    mutationFn: async (
      params: GoogleSheetsLoadOptions & GoogleSheetsParseOptions,
    ): Promise<GoogleSheetsLoadResult> => {
      const { datasetId, xlsxBytes, spreadsheetName, sheetName, hasHeader } =
        params;
      const file = _makeWorkbookFile({ xlsxBytes, spreadsheetName });

      const sniff = await LocalDatasetClient.startXlsxImport({
        datasetId,
        userId: user!.id as UserId,
        workspaceId: workspace.id,
        file,
        parseOptions: { sheet: sheetName, hasHeader },
      });

      return {
        datasetId,
        numRows: sniff.previewRows.length,
        spreadsheetName,
        availableSheetNames: sniff.sheets,
        previewRows: sniff.previewRows,
        sheetLoadMetadata: {
          id: uuid() as DuckDbLoadXlsxResult["id"],
          type: "xlsx",
          tableName: datasetId,
          xlsxName: file.name,
          columns: sniff.columns.map((columnName) => {
            return {
              column_name: columnName,
              column_type: "VARCHAR",
              null: "YES",
              key: null,
              default: null,
              extra: null,
            };
          }),
          sheet: sheetName ?? sniff.defaultSheet,
          numRows: sniff.previewRows.length,
          // The sniff phase does not produce parquetData; the background
          // parquet transcoding writes the real Blob into Dexie. Downstream
          // consumers read parquetData from the Dexie row, not from this
          // result object, so a placeholder is safe.
          parquetData: new Blob(),
        },
      };
    },
    onSuccess: (loadResult, inputParams) => {
      setDataSourceMetadata({
        sourceType: "google_sheets",
        googleAccountId: inputParams.googleAccountId,
        googleDocumentId: inputParams.documentId,
        datasetLoadResult: loadResult,
        parseOptions: {
          type: "google_sheets",
          sheetName: loadResult.sheetLoadMetadata.sheet,
          hasHeader: inputParams.hasHeader,
        },
      });

      const numSuccessRows = loadResult.sheetLoadMetadata.numRows;
      if (numSuccessRows === 0) {
        notifyError({
          title: t`File failed to load`,
          message: t`No rows were read successfully`,
        });
        return;
      }
      notifySuccess({
        title: t`File loaded successfully`,
        message: t`Parsed ${formatNumber(numSuccessRows)} rows`,
      });
    },
    onError: (error) => {
      Logger.error(error, { devMsg: "Google Sheet failed to load" });
      notifyError(getGoogleSheetImportErrorCopy({ error, i18n }));
    },
  });

  const requestSheetParse = useCallback(
    async (params: Readonly<GoogleSheetParseRequest>) => {
      const {
        documentId,
        googleAccountId,
        newDatasetId,
        datasetIdToDrop,
        workbook,
        parseOptions = { type: "google_sheets" },
      } = params;
      if (datasetIdToDrop) {
        await LocalDatasetClient.dropLocalDataset({
          datasetId: datasetIdToDrop,
        });
      }

      loadGoogleSheet({
        ...parseOptions,
        documentId,
        googleAccountId,
        datasetId: newDatasetId,
        xlsxBytes: workbook.xlsxBytes,
        spreadsheetName: workbook.spreadsheetName,
      });
    },
    [loadGoogleSheet],
  );

  const onGoogleSheetPicked = useCallback(
    (params: {
      document: GPickerDocumentObject;
      googleAccount: GoogleToken;
    }) => {
      const { document, googleAccount } = params;
      setSelectedDocument(document);
      setDataSourceMetadata(undefined);
      setExportedWorkbook(undefined);

      exportGoogleSheet({
        documentId: document.id,
        googleAccountId: googleAccount.google_account_id,
        accessToken: googleAccount.access_token,
        spreadsheetName: document.name ?? t`Google Sheet`,
      });
    },
    [exportGoogleSheet, t],
  );

  const onPickerCancel = useCallback(() => {
    // A dismissal is a decision, not a failure, so there is no notification.
    // The state reset is the whole point: without it the "Selected document"
    // line and its loader from a previous pick stay on screen.
    setSelectedDocument(undefined);
    setDataSourceMetadata(undefined);
    setExportedWorkbook(undefined);
  }, []);

  const onRequestDataReparse = useCallback(
    async (parseOptions: FileParseOptions) => {
      if (
        parseOptions.type !== "google_sheets" ||
        !dataSourceMetadata ||
        !exportedWorkbook
      ) {
        return;
      }
      // Re-parsing a different tab reads the workbook already in hand rather
      // than exporting it again: `files.export` is workbook scoped, so every
      // tab is in these bytes.
      await requestSheetParse({
        newDatasetId: uuid() as Dataset.Id,
        datasetIdToDrop: dataSourceMetadata.datasetLoadResult.datasetId,
        documentId: dataSourceMetadata.googleDocumentId,
        googleAccountId: dataSourceMetadata.googleAccountId,
        workbook: exportedWorkbook,
        parseOptions,
      });
    },
    [dataSourceMetadata, exportedWorkbook, requestSheetParse],
  );

  return {
    selectedDocument,
    exportedWorkbook,
    // Read off the load result rather than kept in their own state: the sniff
    // that produced them is the same thing that produced the metadata, so the
    // two can never disagree about whether a preview exists.
    previewRows: dataSourceMetadata?.datasetLoadResult.previewRows,
    dataSourceMetadata,
    setDataSourceMetadata,
    isExportingSheet: isExportingGoogleSheet,
    isLoadingSheet: isLoadingGoogleSheet,
    onGoogleSheetPicked,
    onPickerCancel,
    onRequestDataReparse,
  };
}
