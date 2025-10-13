import { Box, BoxProps, Button, Loader, Stack, Text } from "@mantine/core";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { APIClient } from "@/clients/APIClient";
import { DatasetClient } from "@/clients/datasets/DatasetClient";
import { LocalDatasetClient } from "@/clients/datasets/LocalDatasetClient";
import { DuckDBClient } from "@/clients/DuckDBClient";
import { DuckDBDataTypeUtils } from "@/clients/DuckDBClient/DuckDBDataType";
import { DuckDBLoadCSVResult } from "@/clients/DuckDBClient/types";
import { AppConfig } from "@/config/AppConfig";
import { useGooglePicker } from "@/hooks/ui/useGooglePicker";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { useQuery } from "@/lib/hooks/query/useQuery";
import { GoogleToken } from "@/lib/hooks/useGooglePickerAPI";
import { Logger } from "@/lib/Logger";
import { MIMEType, UnknownObject } from "@/lib/types/common";
import { GPickerDocumentObject } from "@/lib/types/google-picker";
import {
  notifyError,
  notifySuccess,
  notifyWarning,
} from "@/lib/ui/notifications/notify";
import { assertIsDefined } from "@/lib/utils/asserts";
import { getCurrentURL } from "@/lib/utils/browser/getCurrentURL";
import { navigateToExternalURL } from "@/lib/utils/browser/navigateToExternalURL";
import { snakeCaseKeysShallow } from "@/lib/utils/objects/transformations";
import { uuid } from "@/lib/utils/uuid";
import { csvCellValueSchema } from "@/lib/utils/zodHelpers";
import { Dataset, DatasetId } from "@/models/datasets/Dataset";
import { unparseDataset } from "@/models/LocalDataset/utils";
import { WorkspaceId } from "@/models/Workspace/types";
import { APIReturnType } from "@/types/http-api.types";
import { DetectedDatasetColumn } from "../../hooks/detectColumnDataTypes";
import {
  DatasetUploadForm,
  DatasetUploadFormValues,
} from "../DatasetUploadForm";

type GoogleSpreadsheetData = APIReturnType<"google-sheets/:id">;

type Props = BoxProps;

async function saveGoogleSheetToBackend(params: {
  name: string;
  datasetId: DatasetId;
  description: string;
  googleAccount: GoogleToken;
  googleDocument: GPickerDocumentObject;
  columns: DetectedDatasetColumn[];
  workspaceId: WorkspaceId;
  loadCSVResult: DuckDBLoadCSVResult;
}): Promise<Dataset> {
  const {
    name,
    description,
    googleAccount,
    googleDocument,
    columns,
    workspaceId,
    loadCSVResult,
    datasetId,
  } = params;
  const dataset = await DatasetClient.insertGoogleSheetsDataset({
    datasetId,
    workspaceId: workspaceId,
    datasetName: name,
    datasetDescription: description,
    googleAccountId: googleAccount.google_account_id,
    googleDocumentId: googleDocument.id,
    columns: columns.map(snakeCaseKeysShallow),
    rowsToSkip: loadCSVResult.csvSniff.SkipRows ?? 0,
  });
  return dataset;
}

export function GoogleSheetsImportView({ ...props }: Props): JSX.Element {
  const queryClient = useQueryClient();
  const workspace = useCurrentWorkspace();
  const [selectedDocument, setSelectedDocument] = useState<
    GPickerDocumentObject | undefined
  >();

  const selectedDocumentId = selectedDocument?.id;
  const [parseOptions, setParseOptions] = useState<{
    fileText: string;
    datasetId: DatasetId;
    spreadsheetName: string;
    numRowsToSkip?: number;
    delimiter?: string;
  }>();

  const [spreadsheet, isLoadingSpreadsheet] = useQuery({
    queryKey: ["google-sheets", selectedDocumentId],
    queryFn: async (): Promise<GoogleSpreadsheetData> => {
      assertIsDefined(selectedDocumentId, "A spreadsheet must be selected");
      const googleSpreadsheet = await APIClient.get("google-sheets/:id", {
        urlParams: { id: selectedDocumentId },
      });
      const csvString = unparseDataset({
        datasetType: MIMEType.APPLICATION_GOOGLE_SPREADSHEET,
        data: z
          .array(z.array(csvCellValueSchema))
          .parse(googleSpreadsheet.rows),
      });
      setParseOptions({
        fileText: csvString,
        spreadsheetName: googleSpreadsheet.spreadsheetName,
        datasetId: uuid(),
      });
      return googleSpreadsheet;
    },
    enabled: !!selectedDocumentId,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });

  // query to load the data locally to DuckDB
  const [loadResults, _, loadQueryObj] = useQuery({
    queryKey: ["load-csv-text", parseOptions],
    queryFn: async (): Promise<
      | {
          datasetId: DatasetId;
          metadata: DuckDBLoadCSVResult;
          previewRows: UnknownObject[];
        }
      | undefined
    > => {
      if (!parseOptions) {
        return undefined;
      }
      const { fileText, datasetId, numRowsToSkip, delimiter } = parseOptions;
      const loadResult = await LocalDatasetClient.storeLocalCSV({
        datasetId,
        csvParseOptions: {
          fileText,
          numRowsToSkip,
          delimiter,
        },
      });
      const previewData = await DuckDBClient.runRawQuery(
        `SELECT * FROM "$tableName$" LIMIT $maxPreviewRows$`,
        {
          params: {
            tableName: datasetId,
            maxPreviewRows: AppConfig.dataManagerApp.maxPreviewRows,
          },
        },
      );
      return { datasetId, metadata: loadResult, previewRows: previewData.data };
    },
    enabled: !!parseOptions,
    // this ensures that we dont immediately set `loadResults` to undefined when
    // the `parseOptions` change.
    usePreviousDataAsPlaceholder: true,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });

  const {
    picker,
    selectedGoogleAccount,
    isLoadingGoogleAuthState,
    isGoogleAuthenticated,
  } = useGooglePicker({
    onGoogleSheetPicked: setSelectedDocument,
  });

  // check if dataset has loaded and if so, show a notification
  useEffect(() => {
    if (loadResults) {
      const {
        metadata: { numRows: numSuccessRows, numRejectedRows },
      } = loadResults;
      if (numRejectedRows === 0) {
        notifySuccess({
          title: "File loaded successfully",
          message: `Parsed ${numSuccessRows} rows`,
        });
      } else if (numSuccessRows === 0) {
        notifyError({
          title: "File failed to load",
          message: "No rows were read successfully",
        });
      } else {
        notifyWarning({
          title: "File was partially loaded",
          message: `Parsed ${numSuccessRows} rows successfully, but ${
            numRejectedRows > 1000 ?
              " over 1000 rows were rejected"
            : ` ${numRejectedRows} rows were rejected`
          }`,
        });
      }
    }
  }, [loadResults]);

  const detectedColumns = useMemo(() => {
    return loadResults?.metadata?.columns.map((duckColumn, idx) => {
      return {
        name: duckColumn.column_name,
        dataType: DuckDBDataTypeUtils.toDatasetColumnDataType(
          duckColumn.column_type,
        ),
        columnIdx: idx,
      };
    });
  }, [loadResults?.metadata?.columns]);

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
                {isLoadingSpreadsheet ?
                  <Loader />
                : null}
              </>
            : null}
          </>
        : <Button
            fullWidth
            variant="filled"
            size="md"
            onClick={async () => {
              try {
                const { authorizeURL } = await APIClient.get(
                  "google-auth/auth-url",
                  {
                    queryParams: {
                      redirectURL: getCurrentURL(),
                    },
                  },
                );

                // Redirect to the auth URL
                navigateToExternalURL(authorizeURL);
              } catch (error) {
                Logger.error(error, {
                  devMsg: "Error while fetching Google auth URL",
                });
                notifyError(
                  "Google authentication error",
                  "There was an error while trying to authenticate with Google Sheets.",
                );
                return;
              }
            }}
          >
            Connect to Google Sheets
          </Button>
        }

        {(
          detectedColumns &&
          parseOptions &&
          spreadsheet &&
          loadResults &&
          selectedGoogleAccount &&
          selectedDocument
        ) ?
          <DatasetUploadForm
            key={loadResults.metadata.id}
            defaultName={parseOptions.spreadsheetName}
            rows={loadResults.previewRows}
            columns={detectedColumns}
            doDatasetSave={async (
              datasetFormValues: DatasetUploadFormValues,
            ) => {
              const dataset = await saveGoogleSheetToBackend({
                datasetId: loadResults.datasetId,
                workspaceId: workspace.id,
                name: datasetFormValues.name,
                description: datasetFormValues.description,
                googleAccount: selectedGoogleAccount,
                googleDocument: selectedDocument,
                columns: detectedColumns,
                loadCSVResult: loadResults.metadata,
              });
              queryClient.invalidateQueries({
                queryKey: DatasetClient.QueryKeys.getAll(),
              });
              return dataset;
            }}
            loadCSVResult={loadResults.metadata}
            onRequestDataParse={async (parseConfig: {
              numRowsToSkip: number;
              delimiter: string;
            }) => {
              // drop the dataset so we can re-parse it from scratch
              await LocalDatasetClient.dropLocalDataset({
                datasetId: loadResults.datasetId,
              });

              setParseOptions((prevParseOptions) => {
                if (prevParseOptions) {
                  return {
                    ...prevParseOptions,
                    numRowsToSkip: parseConfig.numRowsToSkip,
                    delimiter: parseConfig.delimiter,

                    // generate a new local table name for this new parsing
                    datasetId: uuid(),
                  };
                }
                return prevParseOptions;
              });
            }}
            isProcessing={loadQueryObj.isFetching}
          />
        : null}
      </Stack>
    </Box>
  );
}
