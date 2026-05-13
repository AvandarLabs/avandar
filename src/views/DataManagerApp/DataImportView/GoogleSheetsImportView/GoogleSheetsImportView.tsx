import { useMutation } from "@hooks";
import { Box, BoxProps, Button, Loader, Stack, Text } from "@mantine/core";
import {
  notifyError,
  notifySuccess,
  notifyWarning, Tooltip 
} from "@ui";
import { formatNumber, MIMEType  } from "@utils";
import { uuid } from "$/lib/uuid";
import { csvCellValueSchema } from "$/lib/zodHelpers";
import { useCallback, useState } from "react";
import { z } from "zod";
import { APIClient } from "@/clients/APIClient";
import { DatasetQueryClient } from "@/clients/datasets/DatasetQueryClient";
import { LocalDatasetClient } from "@/clients/datasets/LocalDatasetClient";
import { AppConfig } from "@/config/AppConfig";
import { useGooglePicker } from "@/hooks/ui/useGooglePicker";
import { useCurrentUser } from "@/hooks/users/useCurrentUser";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { GoogleToken } from "@/lib/hooks/useGooglePickerAPI";
import { GPickerDocumentObject } from "@/lib/types/google-picker";
import { getCurrentURL } from "@/lib/utils/browser/getCurrentURL";
import { navigateToExternalURL } from "@/lib/utils/browser/navigateToExternalURL";
import { unparseDataset } from "@/models/LocalDataset/LocalDatasetUtils";
import { Logger } from "@/utils/Logger";
import { DatasetImportForm } from "@/views/DataManagerApp/DataImportView/DatasetImportForm/DatasetImportForm";
import type {
  GoogleSheetsDataSourceMetadata,
  GoogleSheetsLoadResult,
} from "@/views/DataManagerApp/DataImportView/DatasetImportForm/DatasetImportForm";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { UserId } from "$/models/User/User.types";

type GoogleSheetsParseOptions = {
  type: "google_sheets";
  numRowsToSkip?: number;
};

type GoogleSheetsLoadOptions = {
  datasetId: Dataset.Id;
  googleAccountId: string;
  documentId: string;

  /** Raw string containing the spreadsheet data */
  rawText: string;

  /** Name of the google sheet */
  spreadsheetName: string;
};

type GoogleSheetsRawData = {
  rawText: string;
  spreadsheetName: string;
};

type Props = BoxProps;

export function GoogleSheetsImportView(props: Props): JSX.Element {
  const user = useCurrentUser();
  const workspace = useCurrentWorkspace();
  const [selectedDocument, setSelectedDocument] = useState<
    GPickerDocumentObject | undefined
  >();
  const [dataSourceMetadata, setDataSourceMetadata] = useState<
    GoogleSheetsDataSourceMetadata | undefined
  >();
  const [previewRows] = DatasetQueryClient.useGetPreviewData({
    datasetId: dataSourceMetadata?.datasetLoadResult.datasetId,
    numRows: AppConfig.dataManagerApp.maxPreviewRows,
    workspaceId: workspace.id,
    useQueryOptions: {
      enabled: !!dataSourceMetadata?.datasetLoadResult,
    },
  });
  const [fetchedGoogleSheetRawData, setFetchedGoogleSheetRawData] = useState<
    GoogleSheetsRawData | undefined
  >();

  const [fetchGoogleSheet, isFetchingGoogleSheet] = useMutation({
    mutationFn: async (params: {
      documentId: string;
      googleAccountId: string;
    }) => {
      const { documentId } = params;
      const googleSpreadsheet = await APIClient.get({
        route: "google-sheets/:id",
        pathParams: { id: documentId },
      });
      return {
        // convert our Google Sheets data into a CSV string so it can be
        // loaded easily into DuckDb and local storage.
        rawText: unparseDataset({
          datasetType: MIMEType.APPLICATION_GOOGLE_SPREADSHEET,
          data: z
            .array(z.array(csvCellValueSchema))
            .parse(googleSpreadsheet.rows),
        }),
        spreadsheetName: googleSpreadsheet.spreadsheetName,
      };
    },
    onSuccess: (gsheetRawData, inputParams) => {
      if (selectedGoogleAccount) {
        onRequestParse({
          documentId: inputParams.documentId,
          googleAccountId: inputParams.googleAccountId,
          newDatasetId: uuid() as Dataset.Id,
          rawText: gsheetRawData.rawText,
          spreadsheetName: gsheetRawData.spreadsheetName,
        });
      }
    },
    onError: () => {
      notifyError({
        title: "Google Sheet failed to load",
        message: "An error occurred while loading the file",
      });
    },
  });

  // create mutation to load a Google Sheet into local storage after it has
  // been picked from the Google Picker and we have fetched its raw data
  const [loadGoogleSheet, isLoadingGoogleSheet] = useMutation({
    mutationFn: async (
      params: GoogleSheetsLoadOptions & GoogleSheetsParseOptions,
    ): Promise<GoogleSheetsLoadResult> => {
      const { datasetId, numRowsToSkip, rawText, spreadsheetName } = params;

      // store our Google Sheets-turned-CSV string into local storage.
      const loadResult = await LocalDatasetClient.storeLocalCSV({
        csvParseOptions: {
          fileText: rawText,
          numRowsToSkip,
        },
        datasetId,
        userId: user!.id as UserId,
        workspaceId: workspace.id,
      });

      const googleSheetsLoadResult: GoogleSheetsLoadResult = {
        datasetId,
        numRows: loadResult.numRows,
        rawText,
        spreadsheetName,
        sheetLoadMetadata: loadResult,
      };
      return googleSheetsLoadResult;
    },
    onSuccess: (loadResult, inputParams) => {
      setDataSourceMetadata({
        sourceType: "google_sheets",
        googleAccountId: inputParams.googleAccountId,
        googleDocumentId: inputParams.documentId,
        datasetLoadResult: loadResult,
        parseOptions: {
          type: "google_sheets",
          numRowsToSkip: inputParams.numRowsToSkip,
        },
      });

      const {
        sheetLoadMetadata: { numRows: numSuccessRows, numRejectedRows },
      } = loadResult;
      if (numRejectedRows === 0) {
        notifySuccess({
          title: "File loaded successfully",
          message: `Parsed ${formatNumber(numSuccessRows)} rows`,
        });
      } else if (numSuccessRows === 0) {
        notifyError({
          title: "File failed to load",
          message: "No rows were read successfully",
        });
      } else {
        const numRejectedStr =
          numRejectedRows > 1000 ?
            " over 1000 rows were rejected"
          : ` ${numRejectedRows} rows were rejected`;
        notifyWarning({
          title: "File was partially loaded",
          message: `Parsed ${numSuccessRows} rows successfully, but ${numRejectedStr}`,
        });
      }
    },
    onError: () => {
      notifyError({
        title: "File failed to load",
        message: "An error occurred while loading the file",
      });
    },
  });

  const onRequestParse = useCallback(
    async (params: {
      documentId: GPickerDocumentObject["id"];
      googleAccountId: string;
      rawText: string;
      spreadsheetName: string;
      newDatasetId: Dataset.Id;
      datasetIdToDrop?: Dataset.Id;
      parseOptions?: GoogleSheetsParseOptions;
    }) => {
      const {
        documentId,
        googleAccountId,
        newDatasetId,
        datasetIdToDrop,
        rawText,
        spreadsheetName,
        parseOptions = { type: "google_sheets" },
      } = params;
      setFetchedGoogleSheetRawData({ rawText, spreadsheetName });
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
        rawText,
        spreadsheetName,
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

      // fetch the raw data for the Google Sheet
      fetchGoogleSheet({
        documentId: document.id,
        googleAccountId: googleAccount.google_account_id,
      });
    },
    [fetchGoogleSheet],
  );

  const {
    picker,
    selectedGoogleAccount,
    isLoadingGoogleAuthState,
    isGoogleAuthenticated,
  } = useGooglePicker({ onGoogleSheetPicked });

  return (
    <Box {...props}>
      <Stack align="flex-start">
        {isLoadingGoogleAuthState ?
          <Loader />
        : isGoogleAuthenticated ?
          <>
            {selectedGoogleAccount ?
              <Text>
                You have successfully connected to{" "}
                {selectedGoogleAccount.google_email}
              </Text>
            : null}

            <Button
              onClick={() => {
                if (picker) {
                  picker.setVisible(true);
                }
              }}
            >
              Pick google sheet
            </Button>

            {selectedDocument ?
              <>
                <Text>Selected document: {selectedDocument.name}</Text>
                {isLoadingGoogleSheet ?
                  <Loader />
                : null}
              </>
            : null}
          </>
        : <Tooltip label="Google sheets connector is disabled while this feature is under maintenance.">
            <Button
              disabled
              fullWidth
              size="md"
              variant="filled"
              onClick={async () => {
                try {
                  const { authorizeURL } = await APIClient.get({
                    queryParams: {
                      redirectURL: getCurrentURL(),
                    },
                    route: "google-auth/auth-url",
                  });

                  navigateToExternalURL(authorizeURL);
                } catch (error) {
                  Logger.error(error, {
                    devMsg: "Error while fetching Google auth URL",
                  });
                  notifyError(
                    "Google authentication error",
                    "There was an error while trying to authenticate with Google Sheets.",
                  );
                }
              }}
            >
              Connect to Google Sheets
            </Button>
          </Tooltip>
        }

        {previewRows && dataSourceMetadata && fetchedGoogleSheetRawData ?
          <DatasetImportForm
            key={dataSourceMetadata.datasetLoadResult.sheetLoadMetadata.id}
            dataSourceMetadata={dataSourceMetadata}
            initialDatasetName={
              dataSourceMetadata.datasetLoadResult.spreadsheetName
            }
            isProcessing={isFetchingGoogleSheet || isLoadingGoogleSheet}
            onDataSourceMetadataChange={(metadata) => {
              setDataSourceMetadata(metadata as GoogleSheetsDataSourceMetadata);
            }}
            onRequestDataReparse={async (parseOptions) => {
              if (parseOptions.type !== "google_sheets") {
                return;
              }
              const { rawText, spreadsheetName } = fetchedGoogleSheetRawData;
              onRequestParse({
                newDatasetId: uuid() as Dataset.Id,
                documentId: dataSourceMetadata.googleDocumentId,
                googleAccountId: dataSourceMetadata.googleAccountId,
                rawText,
                spreadsheetName,
                parseOptions,
              });
            }}
            parseOptions={dataSourceMetadata.parseOptions}
            rows={previewRows}
          />
        : null}
      </Stack>
    </Box>
  );
}
