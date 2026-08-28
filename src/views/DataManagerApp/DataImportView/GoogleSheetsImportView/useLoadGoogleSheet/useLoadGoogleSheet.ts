import { useMutation } from "@avandar/query-hooks";
import { formatNumber, MIMEType } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { useCallback, useState } from "react";
import { uuid } from "$/lib/uuid";
import { LocalDatasetClient } from "@/clients/datasets/LocalDatasetClient/LocalDatasetClient";
import {
  getGoogleSheetTabCsvExport,
  getGoogleSheetTabs,
} from "@/clients/google/GoogleDriveClient/GoogleDriveClient";
import { useCurrentUser } from "@/hooks/users/useCurrentUser";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { Logger } from "@/utils/Logger";
import { notifyError, notifySuccess } from "@/utils/notifications/notify";
import { getGoogleSheetImportErrorCopy } from "@/views/DataManagerApp/DataImportView/GoogleSheetsImportView/getGoogleSheetImportErrorCopy";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { UserId } from "$/models/User/User.types";
import type { UnknownRow } from "@/clients/DuckDbClient/DuckDbClient";
import type { DuckDbLoadCsvResult } from "@/clients/DuckDbClient/DuckDbClient.types";
import type { GoogleSheetTab } from "@/clients/google/GoogleDriveClient/GoogleDriveClient.types";
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
 * The picked file and the account that can read it.
 *
 * Kept together because every later call needs both, and kept at all because
 * the tab is chosen after the pick: the export, and every re-parse after it,
 * happen with no picker in sight.
 */
type PickedGoogleSheet = {
  documentId: string;
  spreadsheetName: string;
  googleAccountId: string;
  accessToken: string;
};

type GoogleSheetTabImportRequest = {
  sheet: PickedGoogleSheet;
  tab: GoogleSheetTab;

  /**
   * The workbook's full tab list, passed in rather than read from state.
   *
   * A mutation closes over the render that created it, and the tab list is
   * fetched after that render, so reading the state here recorded a load result
   * that knew about one tab. The form's tab selector reads its options from
   * that list, so it then offered no way back to the tabs the user had just
   * been shown.
   */
  availableTabs: GoogleSheetTab[];

  newDatasetId: Dataset.Id;
  datasetIdToDrop?: Dataset.Id;
};

/**
 * Export, parse, reparse and preview state for the Google Sheets import view.
 *
 * The same shape as `ManualUploadParse`, with the retained source being the
 * picked file plus the chosen tab rather than an uploaded `File`. See
 * `../../AGENTS.md` for the shape both views follow.
 */
export type GoogleSheetLoad = {
  pickedSheet: PickedGoogleSheet | undefined;

  /** Every tab in the picked workbook, known before any cell is downloaded. */
  availableTabs: GoogleSheetTab[] | undefined;

  /** The tab the user has chosen but may not have imported yet. */
  selectedTabId: number | undefined;
  setSelectedTabId: (sheetId: number) => void;

  previewRows: UnknownRow[] | undefined;
  dataSourceMetadata: GoogleSheetsDataSourceMetadata | undefined;
  setDataSourceMetadata: (
    metadata: GoogleSheetsDataSourceMetadata | undefined,
  ) => void;

  /** True while the workbook's tab list is being read. */
  isListingTabs: boolean;

  /**
   * True while the chosen tab is being downloaded and sniffed.
   *
   * There is no separate re-parse flag, unlike the manual upload path: a
   * re-parse here runs this very mutation again.
   */
  isLoadingSheet: boolean;

  onGoogleSheetPicked: (params: {
    document: GPickerDocumentObject;
    googleAccount: GoogleToken;
  }) => void;
  onPickerCancel: () => void;

  /** Imports the tab the user selected. The "Process" button calls this. */
  onProcessSelectedTab: () => void;

  onRequestDataReparse: (parseOptions: FileParseOptions) => Promise<void>;
};

/** Wraps a tab's CSV text in the `File` the local import mutation takes. */
function _makeTabCsvFile(
  params: Readonly<{
    csvText: string;
    spreadsheetName: string;
    tabTitle: string;
  }>,
): File {
  return new File(
    [params.csvText],
    `${params.spreadsheetName} - ${params.tabTitle}.csv`,
    { type: MIMEType.TEXT_CSV },
  );
}

/** The tab a re-parse asked for, by gid when it has one and by title if not. */
function _resolveTab(
  params: Readonly<{
    availableTabs: GoogleSheetTab[] | undefined;
    parseOptions: GoogleSheetsParseOptions;
    fallback: GoogleSheetsLoadResult | undefined;
  }>,
): GoogleSheetTab | undefined {
  const { availableTabs, parseOptions, fallback } = params;
  const tabs = availableTabs ?? fallback?.availableTabs ?? [];
  const requested = tabs.find((tab) => {
    return parseOptions.sheetId !== undefined
      ? tab.sheetId === parseOptions.sheetId
      : tab.title === parseOptions.sheetName;
  });
  if (requested) {
    return requested;
  }
  return fallback
    ? { sheetId: fallback.sheetId, title: fallback.sheetName, index: 0 }
    : undefined;
}

/**
 * Owns listing a picked spreadsheet's tabs, downloading the one the user
 * chooses, and re-importing it on demand.
 *
 * Three steps, and the first two are cheap:
 *
 *   - The tab list: `spreadsheets.get` with a properties-only field mask, so
 *     the user can be asked which tab to import before anything is downloaded.
 *     One Avandar dataset is one tab.
 *
 *   - The tab export: that tab alone, as CSV. Not the workbook, and not
 *     `.xlsx`: DuckDB's CSV reader types each column from the data it sees,
 *     where `read_xlsx` has to be told to read everything as text to avoid
 *     aborting on a column whose type changes partway down. Reading CSV is how
 *     a column of numbers arrives as numbers.
 *
 *   - The sniff phase (awaited by this hook): `startCsvImport` produces the
 *     column schema, the dialect and a preview, and fires the background
 *     parquet transcoding.
 *
 * IMPORTANT: this does **not** save the dataset to the backend database;
 * that's `useSaveDataset`.
 */
export function useLoadGoogleSheet(): GoogleSheetLoad {
  const { t, i18n } = useLingui();
  const user = useCurrentUser();
  const workspace = useCurrentWorkspace();
  const [pickedSheet, setPickedSheet] = useState<
    PickedGoogleSheet | undefined
  >();
  const [availableTabs, setAvailableTabs] = useState<
    GoogleSheetTab[] | undefined
  >();
  const [selectedTabId, setSelectedTabId] = useState<number | undefined>();
  const [dataSourceMetadata, setDataSourceMetadata] = useState<
    GoogleSheetsDataSourceMetadata | undefined
  >();

  // Downloads one tab as CSV and sniffs it into a dataset the form can render.
  const [importGoogleSheetTab, isLoadingSheet] = useMutation({
    mutationFn: async (
      params: Readonly<GoogleSheetTabImportRequest>,
    ): Promise<GoogleSheetsLoadResult> => {
      const { sheet, tab, newDatasetId, datasetIdToDrop } = params;
      if (datasetIdToDrop) {
        await LocalDatasetClient.dropLocalDataset({
          datasetId: datasetIdToDrop,
        });
      }

      const { csvText } = await getGoogleSheetTabCsvExport({
        fileId: sheet.documentId,
        sheetId: tab.sheetId,
        accessToken: sheet.accessToken,
      });
      const file = _makeTabCsvFile({
        csvText,
        spreadsheetName: sheet.spreadsheetName,
        tabTitle: tab.title,
      });

      const sniff = await LocalDatasetClient.startCsvImport({
        datasetId: newDatasetId,
        userId: user!.id as UserId,
        workspaceId: workspace.id,
        file,
        parseOptions: {},
      });

      // Synthesized from the sniff phase, the same way the manual CSV branch
      // does it: `parquetData` is not real yet, because the background parquet
      // transcoding writes the actual parquet into the LocalDataset row on its
      // own, and `numRows` is the preview's count until it finishes.
      return {
        datasetId: newDatasetId,
        numRows: sniff.previewRows.length,
        id: uuid() as DuckDbLoadCsvResult["id"],
        type: "csv",
        tableName: newDatasetId,
        csvName: file.name,
        columns: sniff.columns,
        csvSniff: sniff.csvSniff,
        errors: { rejectedScans: [], rejectedRows: [] },
        numRejectedRows: 0,
        parquetData: new Blob([], { type: MIMEType.APPLICATION_PARQUET }),
        availableTabs: params.availableTabs,
        sheetId: tab.sheetId,
        sheetName: tab.title,
        spreadsheetName: sheet.spreadsheetName,
        previewRows: sniff.previewRows,
      };
    },
    onSuccess: (loadResult, inputParams) => {
      setDataSourceMetadata({
        sourceType: "google_sheets",
        googleAccountId: inputParams.sheet.googleAccountId,
        googleDocumentId: inputParams.sheet.documentId,
        datasetLoadResult: loadResult,
        parseOptions: {
          type: "google_sheets",
          sheetName: loadResult.sheetName,
          sheetId: loadResult.sheetId,
        },
      });

      const numSuccessRows = loadResult.numRows;
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
      Logger.error(error, { devMsg: "Google Sheet tab failed to load" });
      notifyError(getGoogleSheetImportErrorCopy({ error, i18n }));
    },
  });

  // Reads the workbook's tab list, which costs no cell data.
  const [listGoogleSheetTabs, isListingTabs] = useMutation({
    mutationFn: async (
      params: Readonly<{ sheet: PickedGoogleSheet }>,
    ): Promise<GoogleSheetTab[]> => {
      return await getGoogleSheetTabs({
        fileId: params.sheet.documentId,
        accessToken: params.sheet.accessToken,
      });
    },
    onSuccess: (tabs, inputParams) => {
      setAvailableTabs(tabs);
      setSelectedTabId(tabs[0]?.sheetId);

      // A workbook with one tab has nothing to ask about, so it imports on the
      // pick, exactly as this view behaved before tabs were selectable.
      const onlyTab = tabs.length === 1 ? tabs[0] : undefined;
      if (onlyTab) {
        importGoogleSheetTab({
          sheet: inputParams.sheet,
          tab: onlyTab,
          availableTabs: tabs,
          newDatasetId: uuid() as Dataset.Id,
        });
      }
    },
    onError: (error) => {
      Logger.error(error, { devMsg: "Google Sheet tab list failed to load" });
      notifyError(getGoogleSheetImportErrorCopy({ error, i18n }));
    },
  });

  const onGoogleSheetPicked = useCallback(
    (params: {
      document: GPickerDocumentObject;
      googleAccount: GoogleToken;
    }) => {
      const { document, googleAccount } = params;
      const sheet: PickedGoogleSheet = {
        documentId: document.id,
        // Carried from the pick rather than read back out of state later: a
        // mutation created during the render before the pick closes over the
        // state as it was then, which gave the first import a placeholder name
        // and every later one the previous sheet's name.
        spreadsheetName: document.name ?? t`Google Sheet`,
        googleAccountId: googleAccount.google_account_id,
        accessToken: googleAccount.access_token,
      };
      setPickedSheet(sheet);
      setAvailableTabs(undefined);
      setSelectedTabId(undefined);
      setDataSourceMetadata(undefined);

      listGoogleSheetTabs({ sheet });
    },
    [listGoogleSheetTabs, t],
  );

  const onPickerCancel = useCallback(() => {
    // A dismissal is a decision, not a failure, so there is no notification.
    // The state reset is the whole point: without it the selected document and
    // its tab list from a previous pick stay on screen.
    setPickedSheet(undefined);
    setAvailableTabs(undefined);
    setSelectedTabId(undefined);
    setDataSourceMetadata(undefined);
  }, []);

  const onProcessSelectedTab = useCallback(() => {
    const tab = availableTabs?.find((candidate) => {
      return candidate.sheetId === selectedTabId;
    });
    if (!pickedSheet || !tab || !availableTabs) {
      return;
    }
    importGoogleSheetTab({
      sheet: pickedSheet,
      tab,
      availableTabs,
      newDatasetId: uuid() as Dataset.Id,
      datasetIdToDrop: dataSourceMetadata?.datasetLoadResult.datasetId,
    });
  }, [
    availableTabs,
    dataSourceMetadata,
    importGoogleSheetTab,
    pickedSheet,
    selectedTabId,
  ]);

  const onRequestDataReparse = useCallback(
    async (parseOptions: FileParseOptions) => {
      if (parseOptions.type !== "google_sheets" || !pickedSheet) {
        return;
      }
      const tabs =
        availableTabs ?? dataSourceMetadata?.datasetLoadResult.availableTabs;
      const tab = _resolveTab({
        availableTabs: tabs,
        parseOptions,
        fallback: dataSourceMetadata?.datasetLoadResult,
      });
      if (!tab) {
        return;
      }
      // Re-downloads the tab rather than re-reading bytes held from an earlier
      // export. A tab is its own download here, and the sheet may well have
      // changed since the last one.
      importGoogleSheetTab({
        sheet: pickedSheet,
        tab,
        availableTabs: tabs ?? [tab],
        newDatasetId: uuid() as Dataset.Id,
        datasetIdToDrop: dataSourceMetadata?.datasetLoadResult.datasetId,
      });
    },
    [availableTabs, dataSourceMetadata, importGoogleSheetTab, pickedSheet],
  );

  return {
    pickedSheet,
    availableTabs,
    selectedTabId,
    setSelectedTabId,
    // Read off the load result rather than kept in their own state: the sniff
    // that produced them is the same thing that produced the metadata, so the
    // two can never disagree about whether a preview exists.
    previewRows: dataSourceMetadata?.datasetLoadResult.previewRows,
    dataSourceMetadata,
    setDataSourceMetadata,
    isListingTabs,
    isLoadingSheet,
    onGoogleSheetPicked,
    onPickerCancel,
    onProcessSelectedTab,
    onRequestDataReparse,
  };
}
