import { Button, Loader, Stack, Text } from "@mantine/core";
import { IconArrowLeft } from "@tabler/icons-react";
import { useState } from "react";
import { z } from "zod";
import { APIClient } from "@/clients/APIClient";
import { useGooglePicker } from "@/hooks/ui/useGooglePicker";
import { useMutation } from "@/lib/hooks/query/useMutation";
import { Logger } from "@/lib/Logger";
import { MIMEType } from "@/lib/types/common";
import { GPickerDocumentObject } from "@/lib/types/google-picker";
import { notifyError } from "@/lib/ui/notifications/notifyError";
import { notifySuccess } from "@/lib/ui/notifications/notifySuccess";
import { Paper } from "@/lib/ui/Paper";
import { DangerText } from "@/lib/ui/Text/DangerText";
import { getCurrentURL } from "@/lib/utils/browser/getCurrentURL";
import { navigateToExternalURL } from "@/lib/utils/browser/navigateToExternalURL";
import { csvCellValueSchema } from "@/lib/utils/zodHelpers";
import { unparseDataset } from "@/models/LocalDataset/utils";
import { APIReturnType } from "@/types/http-api.types";
import { useCSVParser } from "../../hooks/useCSVParser";
import { DatasetUploadForm } from "../DatasetUploadForm";

type Props = {
  onBackClick: () => void;
};

type SpreadsheetPreview = APIReturnType<"google-sheets/:id/preview">;

export function GoogleSheetsImportView({ onBackClick }: Props): JSX.Element {
  const [selectedDocument, setSelectedDocument] = useState<
    GPickerDocumentObject | undefined
  >();
  const { parseCSVString, csv, fields } = useCSVParser({
    onNoFileProvided: () => {
      notifyError({
        title: "No rows were found in this sheet",
        message:
          "Please double check that the sheet is not empty. Otherwise, contact support for help.",
      });
    },
  });
  const [spreadsheet, setSpreadsheet] = useState<
    SpreadsheetPreview | undefined
  >();
  const [getSpreadsheet, isLoadingSpreadsheet] = useMutation({
    mutationFn: async () => {
      if (!selectedDocument) {
        throw new Error("No spreadsheet was selected");
      }
      const preview = await APIClient.post("google-sheets/:id/preview", {
        urlParams: {
          id: selectedDocument.id,
        },
      });
      return preview;
    },
    onSuccess: (data: SpreadsheetPreview) => {
      setSpreadsheet(data);
      notifySuccess({
        title: "Spreadsheet preview",
        message: data?.sheetName,
      });
      const csvString = unparseDataset({
        datasetType: MIMEType.APPLICATION_GOOGLE_SPREADSHEET,
        data: z.array(z.array(csvCellValueSchema)).parse(data.rows),
      });
      parseCSVString(csvString);
    },
  });

  const {
    picker,
    selectedGoogleAccount,
    isLoadingGoogleAuthState,
    isGoogleAuthenticated,
  } = useGooglePicker({
    onGoogleSheetPicked: setSelectedDocument,
  });

  return (
    <Paper>
      <Stack align="flex-start">
        <DangerText>
          Google Sheets connection is still under development.
        </DangerText>
        <Button
          variant="subtle"
          size="compact-sm"
          color="neutral"
          leftSection={<IconArrowLeft size={16} />}
          onClick={onBackClick}
        >
          Back
        </Button>
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
                <Button
                  loading={isLoadingSpreadsheet}
                  onClick={() => {
                    getSpreadsheet();
                  }}
                >
                  Upload
                </Button>
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
            disableSubmit
            defaultName={spreadsheet.spreadsheetName}
            rows={csv.data}
            fields={fields}
          />
        : null}
      </Stack>
    </Paper>
  );
}
