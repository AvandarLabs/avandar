import { Box, BoxProps, Button, Loader, Stack, Text } from "@mantine/core";
import { useQueryClient } from "@tanstack/react-query";
import { invariant } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { z } from "zod";
import { APIClient } from "@/clients/APIClient";
import { DatasetClient } from "@/clients/datasets/DatasetClient";
import { DuckDBClient } from "@/clients/DuckDBClient";
import { DuckDBDataType } from "@/clients/DuckDBClient/DuckDBDataType";
import { DuckDBLoadCSVResult } from "@/clients/DuckDBClient/types";
import { AppConfig } from "@/config/AppConfig";
import { useGooglePicker } from "@/hooks/ui/useGooglePicker";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { useMutation } from "@/lib/hooks/query/useMutation";
import { useQuery } from "@/lib/hooks/query/useQuery";
import { Logger } from "@/lib/Logger";
import { MIMEType, UnknownObject } from "@/lib/types/common";
import { GPickerDocumentObject } from "@/lib/types/google-picker";
import {
  notifyError,
  notifySuccess,
  notifyWarning,
} from "@/lib/ui/notifications/notify";
import { getCurrentURL } from "@/lib/utils/browser/getCurrentURL";
import { navigateToExternalURL } from "@/lib/utils/browser/navigateToExternalURL";
import { snakeCaseKeysShallow } from "@/lib/utils/objects/transformations";
import { csvCellValueSchema } from "@/lib/utils/zodHelpers";
import { unparseDataset } from "@/models/LocalDataset/utils";
import { APIReturnType } from "@/types/http-api.types";
import {
  DatasetUploadForm,
  DatasetUploadFormValues,
} from "../DatasetUploadForm";

type GoogleSpreadsheetData = APIReturnType<"google-sheets/:id">;

type Props = BoxProps;

export function GoogleSheetsImportView({ ...props }: Props): JSX.Element {
  const workspace = useCurrentWorkspace();
  const queryClient = useQueryClient();
  const [selectedDocument, setSelectedDocument] = useState<
    GPickerDocumentObject | undefined
  >();

  const selectedDocumentId = selectedDocument?.id;

  const [isReprocessing, setIsReprocessing] = useState(false);
  const [loadCSVResult, setLoadCSVResult] = useState<DuckDBLoadCSVResult>();
  const [loadCSV, _isLoadingCSV] = useMutation({
    mutationFn: async ({
      csvName,
      fileText,
      numRowsToSkip,
      delimiter,
    }: {
      csvName: string;
      fileText: string;
      numRowsToSkip?: number;
      delimiter?: string;
    }) => {
      const loadResult = await DuckDBClient.loadCSV({
        fileText,
        csvName,
        numRowsToSkip,
        delimiter,
      });
      return loadResult;
    },
    onSuccess: (loadResult: DuckDBLoadCSVResult) => {
      const { numRows: numSuccessRows, numRejectedRows } = loadResult;
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
      setLoadCSVResult(loadResult);
    },
  });

  const [spreadsheet, isLoadingSpreadsheet] = useQuery({
    queryKey: ["google-sheets", selectedDocumentId],
    queryFn: async (): Promise<GoogleSpreadsheetData> => {
      invariant(selectedDocumentId, "A spreadsheet must be selected");
      const googleSpreadsheet = await APIClient.get("google-sheets/:id", {
        urlParams: { id: selectedDocumentId },
      });

      // TODO(jpsyx): you are here. trigger loadCSV here as a promise.
      // and onSuccess, we should resolve().
      loadCSV({
        csvName: selectedDocumentId,
        // TODO(jpsyx): make this work
        // fileText: csvString,
        fileText: "",
      });

      return googleSpreadsheet;
    },
    enabled: !!selectedDocumentId,
  });

  Logger.log("loaded csv", loadCSVResult);

  const csvString = useMemo(() => {
    if (!spreadsheet) {
      return undefined;
    }
    return unparseDataset({
      datasetType: MIMEType.APPLICATION_GOOGLE_SPREADSHEET,
      data: z.array(z.array(csvCellValueSchema)).parse(spreadsheet.rows),
    });
  }, [spreadsheet]);

  const [previewRows, _isLoadingPreview] = useQuery({
    queryKey: ["google-sheets", selectedDocumentId, "previewData", csvString],
    queryFn: async (): Promise<UnknownObject[]> => {
      invariant(selectedDocumentId, "A spreadsheet name must be provided");
      invariant(csvString, "A CSV string must be provided");
      const previewData = await DuckDBClient.runRawQuery(
        `SELECT * FROM "$tableName$" LIMIT ${AppConfig.dataManagerApp.maxPreviewRows}`,
        { datasetName: selectedDocumentId },
      );

      return previewData.data;
    },
    enabled: !!selectedDocumentId && !!csvString,
  });

  const {
    picker,
    selectedGoogleAccount,
    isLoadingGoogleAuthState,
    isGoogleAuthenticated,
  } = useGooglePicker({
    onGoogleSheetPicked: setSelectedDocument,
  });

  const columns = useMemo(() => {
    return loadCSVResult?.columns.map((duckColumn, idx) => {
      return {
        name: duckColumn.column_name,
        dataType: DuckDBDataType.toDatasetDataType(duckColumn.column_type),
        columnIdx: idx,
      };
    });
  }, [loadCSVResult]);

  const saveGoogleSheetToBackend = async (values: DatasetUploadFormValues) => {
    invariant(selectedGoogleAccount, "No Google account has been selected");
    invariant(selectedDocument, "No Google Sheet has been selected");
    invariant(spreadsheet, "No Google Sheet has been selected");
    invariant(columns, "No columns were detected");
    invariant(loadCSVResult, "No CSV has been loaded");
    const dataset = await DatasetClient.insertGoogleSheetsDataset({
      workspaceId: workspace.id,
      datasetName: values.name,
      datasetDescription: values.description,
      googleAccountId: selectedGoogleAccount.google_account_id,
      googleDocumentId: selectedDocument.id,
      columns: columns.map(snakeCaseKeysShallow),
      rowsToSkip: loadCSVResult.csvSniff.SkipRows ?? 0,
    });
    queryClient.invalidateQueries({
      queryKey: DatasetClient.QueryKeys.getAll(),
    });

    // now that we've persisted the dataset metadata to the backend, let's
    // rename it locally to use the dataset id, which is stable
    await DuckDBClient.renameDataset({
      oldName: spreadsheet.spreadsheetName,
      newName: dataset.id,
    });
    return dataset;
  };

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

        {columns && csvString && previewRows && spreadsheet && loadCSVResult ?
          <DatasetUploadForm
            key={loadCSVResult.id}
            defaultName={spreadsheet.spreadsheetName}
            rows={previewRows}
            columns={columns}
            doDatasetSave={saveGoogleSheetToBackend}
            loadCSVResult={loadCSVResult}
            onRequestDataParse={(parseConfig: {
              numRowsToSkip: number;
              delimiter: string;
            }) => {
              setIsReprocessing(true);
              loadCSV(
                {
                  fileText: csvString,
                  csvName: spreadsheet.spreadsheetName,
                  numRowsToSkip: parseConfig.numRowsToSkip,
                  delimiter: parseConfig.delimiter,
                },
                {
                  onSuccess: () => {
                    setIsReprocessing(false);
                  },
                },
              );
            }}
            isProcessing={isReprocessing}
          />
        : null}
      </Stack>
    </Box>
  );
}
