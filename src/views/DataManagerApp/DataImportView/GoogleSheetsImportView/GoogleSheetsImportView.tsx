import { useMutation } from "@hooks/useMutation/useMutation";
import { Box, BoxProps, Button, Loader, Stack, Text } from "@mantine/core";
import {
  notifyError,
  notifySuccess,
  notifyWarning,
} from "@ui/notifications/notify";
import { Tooltip } from "@ui/Tooltip/Tooltip";
import { formatNumber } from "@utils/numbers/formatNumber/formatNumber";
import { MIMEType } from "@utils/types/common.types";
import { uuid } from "$/lib/uuid";
import { csvCellValueSchema } from "$/lib/zodHelpers";
import { useMemo, useState } from "react";
import { z } from "zod";
import { APIClient } from "@/clients/APIClient";
import { DatasetQueryClient } from "@/clients/datasets/DatasetQueryClient";
import { LocalDatasetClient } from "@/clients/datasets/LocalDatasetClient";
import { DuckDbLoadCsvResult } from "@/clients/DuckDBClient/DuckDBClient.types";
import { DuckDBDataTypeUtils } from "@/clients/DuckDBClient/DuckDBDataType";
import { AppConfig } from "@/config/AppConfig";
import { useGooglePicker } from "@/hooks/ui/useGooglePicker";
import { useCurrentUser } from "@/hooks/users/useCurrentUser";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { GPickerDocumentObject } from "@/lib/types/google-picker";
import { getCurrentURL } from "@/lib/utils/browser/getCurrentURL";
import { navigateToExternalURL } from "@/lib/utils/browser/navigateToExternalURL";
import { unparseDataset } from "@/models/LocalDataset/LocalDatasetUtils";
import { Logger } from "@/utils/Logger";
import { DatasetImportForm } from "@/views/DataManagerApp/DataImportView/DatasetImportForm/DatasetImportForm";
import type { UnknownObject } from "@utils/types/common.types";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { UserId } from "$/models/User/User.types";

type ParseGoogleSheetInput = {
  datasetId: Dataset.Id;
  delimiter?: string;
  documentId?: string;
  numRowsToSkip?: number;
  rawText?: string;
  spreadsheetName?: string;
};

type LoadResults = {
  datasetId: Dataset.Id;
  metadata: DuckDbLoadCsvResult;
  previewRows: UnknownObject[];
};

type ParseGoogleSheetSuccess = LoadResults & {
  fileText: string;
  spreadsheetName: string;
};

type Props = BoxProps;

export function GoogleSheetsImportView(props: Props): JSX.Element {
  const user = useCurrentUser();
  const workspace = useCurrentWorkspace();
  const [selectedDocument, setSelectedDocument] = useState<
    GPickerDocumentObject | undefined
  >();
  const [loadResults, setLoadResults] = useState<LoadResults>();
  const [cachedSheetRawText, setCachedSheetRawText] = useState<
    string | undefined
  >();
  const [cachedSpreadsheetName, setCachedSpreadsheetName] = useState<
    string | undefined
  >();

  const [parseGoogleSheet, isParsingGoogleSheet] = useMutation({
    mutationFn: async (
      input: ParseGoogleSheetInput,
    ): Promise<ParseGoogleSheetSuccess> => {
      let fileText: string;
      let spreadsheetName: string;

      if (input.rawText !== undefined) {
        fileText = input.rawText;
        spreadsheetName = input.spreadsheetName ?? "";
      } else if (input.documentId !== undefined) {
        const googleSpreadsheet = await APIClient.get({
          route: "google-sheets/:id",
          pathParams: { id: input.documentId },
        });

        // convert our Google Sheets data into a CSV string so it can be
        // loaded easily into DuckDb and local storage.
        fileText = unparseDataset({
          datasetType: MIMEType.APPLICATION_GOOGLE_SPREADSHEET,
          data: z
            .array(z.array(csvCellValueSchema))
            .parse(googleSpreadsheet.rows),
        });
        spreadsheetName = googleSpreadsheet.spreadsheetName;
      } else {
        throw new Error(
          "parseGoogleSheet requires either rawText or documentId.",
        );
      }

      const { datasetId, delimiter, numRowsToSkip } = input;

      // store our Google Sheets-turned-CSV string into local storage.
      const loadResult = await LocalDatasetClient.storeLocalCSV({
        csvParseOptions: {
          delimiter,
          fileText,
          numRowsToSkip,
        },
        datasetId,
        userId: user!.id as UserId,
        workspaceId: workspace.id,
      });

      const previewRows = await DatasetQueryClient.getPreviewData({
        datasetId,
        numRows: AppConfig.dataManagerApp.maxPreviewRows,
        workspaceId: workspace.id,
      });

      return {
        datasetId,
        fileText,
        metadata: loadResult,
        previewRows,
        spreadsheetName,
      };
    },
    onSuccess: (results) => {
      setLoadResults({
        datasetId: results.datasetId,
        metadata: results.metadata,
        previewRows: results.previewRows,
      });
      setCachedSheetRawText(results.fileText);
      setCachedSpreadsheetName(results.spreadsheetName);
      const {
        metadata: { numRows: numSuccessRows, numRejectedRows },
      } = results;
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

  const {
    picker,
    selectedGoogleAccount,
    isLoadingGoogleAuthState,
    isGoogleAuthenticated,
  } = useGooglePicker({
    onGoogleSheetPicked: (document) => {
      setSelectedDocument(document);
      setLoadResults(undefined);
      setCachedSheetRawText(undefined);
      setCachedSpreadsheetName(undefined);
      const datasetId = uuid() as Dataset.Id;
      parseGoogleSheet({
        datasetId,
        documentId: document.id,
      });
    },
  });

  const detectedColumns = useMemo(() => {
    return loadResults?.metadata.columns.map((duckColumn, idx) => {
      return {
        name: duckColumn.column_name,
        originalName: duckColumn.column_name,
        originalDataType: duckColumn.column_type,
        detectedDataType: duckColumn.column_type,
        dataType: DuckDBDataTypeUtils.toAvaDataType(duckColumn.column_type),
        columnIdx: idx,
      };
    });
  }, [loadResults?.metadata.columns]);

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
                {isParsingGoogleSheet ?
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

        {(
          cachedSheetRawText !== undefined &&
          cachedSpreadsheetName !== undefined &&
          detectedColumns &&
          loadResults &&
          selectedGoogleAccount &&
          selectedDocument
        ) ?
          <DatasetImportForm
            columns={detectedColumns}
            importPayload={{
              googleAccountId: selectedGoogleAccount.google_account_id,
              googleDocumentId: selectedDocument.id,
              sourceType: "google_sheets",
            }}
            initialDatasetId={loadResults.datasetId}
            initialDatasetName={cachedSpreadsheetName}
            isProcessing={isParsingGoogleSheet}
            key={loadResults.metadata.id}
            loadCsvResult={loadResults.metadata}
            onRequestDataParse={async (parseConfig: {
              delimiter: string;
              numRowsToSkip: number;
            }) => {
              await LocalDatasetClient.dropLocalDataset({
                datasetId: loadResults.datasetId,
              });
              const nextDatasetId = uuid() as Dataset.Id;
              parseGoogleSheet({
                datasetId: nextDatasetId,
                delimiter: parseConfig.delimiter,
                numRowsToSkip: parseConfig.numRowsToSkip,
                rawText: cachedSheetRawText,
                spreadsheetName: cachedSpreadsheetName,
              });
            }}
            rows={loadResults.previewRows}
            showOnlineStorageAllowed={false}
          />
        : null}
      </Stack>
    </Box>
  );
}
