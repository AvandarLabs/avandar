import { getCurrentUrl, navigateToExternalUrl } from "@avandar/browser-utils";
import { useMutation } from "@avandar/query-hooks";
import { Callout } from "@avandar/ui";
import { formatNumber, MIMEType } from "@avandar/utils";
import { Trans, useLingui } from "@lingui/react/macro";
import {
  Box,
  BoxProps,
  Button,
  Loader,
  Stack,
  Text,
  UnstyledButton,
} from "@mantine/core";
import { uuid } from "$/lib/uuid";
import { useCallback, useState } from "react";
import { APIClient } from "@/clients/APIClient";
import { LocalDatasetClient } from "@/clients/datasets/LocalDatasetClient/LocalDatasetClient";
import { getGoogleSheetXlsxExport } from "@/clients/google/GoogleDriveClient/GoogleDriveClient";
import {
  FEATUREBASE_FEATURE_REQUEST_BOARD,
  openFeaturebaseFeedbackWidget,
} from "@/components/buttons/FeedbackButton/openFeaturebaseFeedbackWidget";
import { useGooglePicker } from "@/hooks/ui/useGooglePicker";
import { useCurrentUser } from "@/hooks/users/useCurrentUser";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { GoogleToken } from "@/lib/hooks/useGooglePickerAPI";
import {
  GPicker,
  GPickerDocumentObject,
  GPickerResponseObject,
} from "@/lib/types/google-picker";
import { Logger } from "@/utils/Logger";
import { notifyError, notifySuccess } from "@/utils/notifications/notify";
import { DatasetImportForm } from "@/views/DataManagerApp/DataImportView/DatasetImportForm/DatasetImportForm";
import { getGoogleSheetImportErrorCopy } from "@/views/DataManagerApp/DataImportView/GoogleSheetsImportView/getGoogleSheetImportErrorCopy";
import type { DuckDbLoadXlsxResult } from "@/clients/DuckDbClient/DuckDbClient.types";
import type {
  GoogleSheetsDataSourceMetadata,
  GoogleSheetsLoadResult,
} from "@/views/DataManagerApp/DataImportView/DatasetImportForm/DatasetImportForm.types";
import type { GoogleSheetsParseOptions } from "@/views/DataManagerApp/DataImportView/DatasetImportForm/useSaveDataset/useSaveDataset";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { UserId } from "$/models/User/User.types";

/**
 * The exported workbook, kept so a re-parse against a different tab does not
 * re-export from Drive. Every tab lives in these same bytes.
 */
type ExportedWorkbook = {
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

type Props = BoxProps & {
  /**
   * When set, this callback is invoked with the newly saved dataset instead
   * of the default navigation to the dataset detail page.
   */
  onSaveSuccess?: (dataset: Dataset.T) => void;
};

/** Wraps workbook bytes in the `File` the local import mutation takes. */
function _makeWorkbookFile(workbook: Readonly<ExportedWorkbook>): File {
  return new File(
    [new Blob([workbook.xlsxBytes])],
    `${workbook.spreadsheetName}.xlsx`,
    { type: MIMEType.APPLICATION_OPENXML_EXCEL },
  );
}

function _openGooglePicker(params: {
  picker: GPicker | undefined;
  onUnavailable: () => void;
}): void {
  if (!params.picker) {
    Logger.error("Google Picker was not built; Pick has nothing to open", {
      hasGapi: typeof window.gapi !== "undefined",
      hasPickerNamespace: typeof window.google?.picker !== "undefined",
      pickerBuilderType: typeof window.google?.picker?.PickerBuilder,
    });
    params.onUnavailable();
    return;
  }
  params.picker.setVisible(true);
}

export function GoogleSheetsImportView({
  onSaveSuccess,
  ...props
}: Props): JSX.Element {
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
      onRequestParse({
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

  const onRequestParse = useCallback(
    async (params: {
      documentId: GPickerDocumentObject["id"];
      googleAccountId: string;
      workbook: ExportedWorkbook;
      newDatasetId: Dataset.Id;
      datasetIdToDrop?: Dataset.Id;
      parseOptions?: GoogleSheetsParseOptions;
    }) => {
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
    async (params: {
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

  const notifyPickerCouldNotOpen = useCallback(() => {
    notifyError({
      title: t`Google Picker error`,
      message: t`The Google file picker could not be opened. Please try again.`,
    });
  }, [t]);

  const onPickerError = useCallback(
    (response: GPickerResponseObject) => {
      Logger.error("The Google Picker reported an error", { response });
      notifyPickerCouldNotOpen();
    },
    [notifyPickerCouldNotOpen],
  );

  const {
    picker,
    selectedGoogleAccount,
    isLoadingAPI,
    isLoadingGoogleAuthState,
    isGoogleAuthenticated,
  } = useGooglePicker({
    onGoogleSheetPicked,
    onCancel: onPickerCancel,
    onError: onPickerError,
  });

  const isPreparingPicker =
    isGoogleAuthenticated &&
    !picker &&
    (isLoadingAPI || !selectedGoogleAccount);

  return (
    <Box {...props}>
      <Stack align="flex-start" gap="md">
        <Callout color="warning" messageSize="sm">
          <Text component="div" size="sm">
            <Trans>
              New connectors are being added every month. If there is a database
              or service you use that you need to connect to,{" "}
              <UnstyledButton
                type="button"
                aria-label={t`Request a data source connection via feedback`}
                display="inline"
                p={0}
                h="auto"
                td="underline"
                c="primary"
                fz="sm"
                fw={500}
                style={{ verticalAlign: "baseline" }}
                onClick={() => {
                  openFeaturebaseFeedbackWidget({
                    boardName: FEATUREBASE_FEATURE_REQUEST_BOARD,
                  });
                }}
              >
                please let us know so we can prioritize it
              </UnstyledButton>
              .
            </Trans>
          </Text>
        </Callout>

        {isLoadingGoogleAuthState ?
          <Loader />
        : isGoogleAuthenticated ?
          <>
            {selectedGoogleAccount ?
              <Text>
                <Trans>
                  You have successfully connected to{" "}
                  {selectedGoogleAccount.google_email}
                </Trans>
              </Text>
            : null}

            {isPreparingPicker ?
              <Loader />
            : <Button
                onClick={() => {
                  _openGooglePicker({
                    picker,
                    onUnavailable: notifyPickerCouldNotOpen,
                  });
                }}
              >
                <Trans>Pick google sheet</Trans>
              </Button>
            }

            {selectedDocument ?
              <>
                <Text>
                  <Trans>Selected document: {selectedDocument.name}</Trans>
                </Text>
                {isLoadingGoogleSheet ?
                  <Loader />
                : null}
              </>
            : null}
          </>
        : <Button
            fullWidth
            size="md"
            variant="filled"
            onClick={async () => {
              try {
                const { authorizeURL } = await APIClient.get({
                  queryParams: {
                    redirectURL: getCurrentUrl(),
                  },
                  route: "google-auth/auth-url",
                });

                navigateToExternalUrl(authorizeURL);
              } catch (error) {
                Logger.error(error, {
                  devMsg: "Error while fetching Google auth URL",
                });
                notifyError(
                  t`Google authentication error`,
                  t`There was an error while trying to authenticate with Google Sheets.`,
                );
              }
            }}
          >
            <Trans>Connect to Google Sheets</Trans>
          </Button>
        }

        {dataSourceMetadata && exportedWorkbook ?
          <DatasetImportForm
            key={dataSourceMetadata.datasetLoadResult.sheetLoadMetadata.id}
            dataSourceMetadata={dataSourceMetadata}
            initialDatasetName={
              dataSourceMetadata.datasetLoadResult.spreadsheetName
            }
            isProcessing={isExportingGoogleSheet || isLoadingGoogleSheet}
            onSaveSuccess={onSaveSuccess}
            onDataSourceMetadataChange={(metadata) => {
              setDataSourceMetadata(metadata as GoogleSheetsDataSourceMetadata);
            }}
            onRequestDataReparse={async (parseOptions) => {
              if (parseOptions.type !== "google_sheets") {
                return;
              }
              // Re-parsing a different tab reads the workbook already in hand
              // rather than exporting it again: `files.export` is workbook
              // scoped, so every tab is in these bytes.
              onRequestParse({
                newDatasetId: uuid() as Dataset.Id,
                datasetIdToDrop: dataSourceMetadata.datasetLoadResult.datasetId,
                documentId: dataSourceMetadata.googleDocumentId,
                googleAccountId: dataSourceMetadata.googleAccountId,
                workbook: exportedWorkbook,
                parseOptions,
              });
            }}
            parseOptions={dataSourceMetadata.parseOptions}
            rows={dataSourceMetadata.datasetLoadResult.previewRows}
          />
        : null}
      </Stack>
    </Box>
  );
}
