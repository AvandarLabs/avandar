import { Box, BoxProps, Button, Loader, Stack, Text } from "@mantine/core";
import { useQueryClient } from "@tanstack/react-query";
import { invariant } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { APIClient } from "@/clients/APIClient";
import { DatasetClient } from "@/clients/datsets/DatasetClient";
import { DatasetRawDataClient } from "@/clients/datsets/DatasetRawDataClient";
import { useGooglePicker } from "@/hooks/ui/useGooglePicker";
import { useCurrentUserProfile } from "@/hooks/users/useCurrentUserProfile";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { useQuery } from "@/lib/hooks/query/useQuery";
import { Logger } from "@/lib/Logger";
import { MIMEType } from "@/lib/types/common";
import { GPickerDocumentObject } from "@/lib/types/google-picker";
import { notifyError } from "@/lib/ui/notifications/notify";
import { getCurrentURL } from "@/lib/utils/browser/getCurrentURL";
import { navigateToExternalURL } from "@/lib/utils/browser/navigateToExternalURL";
import { csvCellValueSchema } from "@/lib/utils/zodHelpers";
import { unparseDataset } from "@/models/LocalDataset/utils";
import { APIReturnType } from "@/types/http-api.types";
import { useCSVParser } from "../../hooks/useCSVParser";
import { DatasetUploadForm } from "../DatasetUploadForm";

type GoogleSpreadsheetData = APIReturnType<"google-sheets/:id">;

type Props = BoxProps;

export function GoogleSheetsImportView({ ...props }: Props): JSX.Element {
  const workspace = useCurrentWorkspace();
  const [userProfile] = useCurrentUserProfile();
  const queryClient = useQueryClient();
  const [selectedDocument, setSelectedDocument] = useState<
    GPickerDocumentObject | undefined
  >();
  const [rawDataString, setRawDataString] = useState<string | undefined>();
  const { parseCSVString, csv, columns } = useCSVParser({
    onNoFileProvided: () => {
      notifyError({
        title: "No rows were found in this sheet",
        message:
          "Please double check that the sheet is not empty. Otherwise, contact support for help.",
      });
    },
  });

  const selectedDocumentId = selectedDocument?.id;

  const [spreadsheet, isLoadingSpreadsheet] = useQuery({
    queryKey: ["google-sheets", selectedDocumentId],
    queryFn: async (): Promise<GoogleSpreadsheetData> => {
      invariant(selectedDocumentId, "A spreadsheet must be selected");
      const googleSpreadsheet = await APIClient.get("google-sheets/:id", {
        urlParams: { id: selectedDocumentId },
      });
      // TODO(jpsyx): store the spreadsheet in the local dexie
      const csvString = unparseDataset({
        datasetType: MIMEType.APPLICATION_GOOGLE_SPREADSHEET,
        data: z
          .array(z.array(csvCellValueSchema))
          .parse(googleSpreadsheet.rows),
      });
      setRawDataString(csvString);
      parseCSVString(csvString);
      return googleSpreadsheet;
    },
    enabled: !!selectedDocumentId,
  });

  const {
    picker,
    selectedGoogleAccount,
    isLoadingGoogleAuthState,
    isGoogleAuthenticated,
  } = useGooglePicker({
    onGoogleSheetPicked: setSelectedDocument,
  });

  const saveGoogleSheetToBackend = async (values: DatasetUploadForm) => {
    invariant(selectedGoogleAccount, "No Google account has been selected");
    invariant(selectedDocument, "No Google Sheet has been selected");
    const dataset = await DatasetClient.insertGoogleSheetsDataset({
      workspaceId: workspace.id,
      datasetName: values.name,
      datasetDescription: values.description,
      googleAccountId: selectedGoogleAccount.google_account_id,
      googleDocumentId: selectedDocument.id,
      columns: columns.map((field, idx) => {
        return {
          name: field.name,
          data_type: field.dataType,
          column_idx: idx,
        };
      }),
      // TODO(jpsyx): eventually this should be configurable
      rowsToSkip: 0,
    });
    queryClient.invalidateQueries({
      queryKey: DatasetClient.QueryKeys.getAll(),
    });

    // and also save the raw data locally to Dexie
    // TODO(jpsyx): implement this
    invariant(rawDataString, "No raw data was found");
    invariant(userProfile, "No user profile is available");
    await DatasetRawDataClient.insert({
      data: {
        createdAt: new Date(),
        updatedAt: new Date(),
        datasetId: dataset.id,
        sourceType: "google_sheets",
        ownerId: workspace.ownerId,
        ownerProfileId: userProfile.profileId,
        workspaceId: workspace.id,
        data: rawDataString,
      },
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

        {spreadsheet && csv ?
          <DatasetUploadForm
            defaultName={spreadsheet.spreadsheetName}
            rows={csv.data}
            columns={columns}
            doDatasetSave={saveGoogleSheetToBackend}
          />
        : null}
      </Stack>
    </Box>
  );
}
