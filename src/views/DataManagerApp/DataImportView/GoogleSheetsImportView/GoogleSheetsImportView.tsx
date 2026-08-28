import { getCurrentUrl, navigateToExternalUrl } from "@avandar/browser-utils";
import { Callout } from "@avandar/ui";
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
import { useCallback } from "react";
import { APIClient } from "@/clients/APIClient";
import {
  FEATUREBASE_FEATURE_REQUEST_BOARD,
  openFeaturebaseFeedbackWidget,
} from "@/components/buttons/FeedbackButton/openFeaturebaseFeedbackWidget";
import { useGooglePicker } from "@/hooks/ui/useGooglePicker";
import { Logger } from "@/utils/Logger";
import { notifyError } from "@/utils/notifications/notify";
import { DatasetImportForm } from "@/views/DataManagerApp/DataImportView/DatasetImportForm/DatasetImportForm";
import { useLoadGoogleSheet } from "@/views/DataManagerApp/DataImportView/GoogleSheetsImportView/useLoadGoogleSheet/useLoadGoogleSheet";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { UnknownRow } from "@/clients/DuckDbClient/DuckDbClient";
import type { GPicker, GPickerResponseObject } from "@/lib/types/google-picker";
import type { GoogleSheetsDataSourceMetadata } from "@/views/DataManagerApp/DataImportView/DatasetImportForm/DatasetImportForm.types";
import type { GoogleSheetLoad } from "@/views/DataManagerApp/DataImportView/GoogleSheetsImportView/useLoadGoogleSheet/useLoadGoogleSheet";
import type { ReactNode } from "react";

type Props = BoxProps & {
  /**
   * When set, this callback is invoked with the newly saved dataset instead
   * of the default navigation to the dataset detail page.
   */
  onSaveSuccess?: (dataset: Dataset.T) => void;
};

type GoogleSheetsImportFormProps = {
  previewRows: UnknownRow[];
  dataSourceMetadata: GoogleSheetsDataSourceMetadata;
  isProcessing: boolean;
  onSaveSuccess?: (dataset: Dataset.T) => void;
  onRequestDataReparse: GoogleSheetLoad["onRequestDataReparse"];
  setDataSourceMetadata: GoogleSheetLoad["setDataSourceMetadata"];
};

function _GoogleSheetsImportForm(
  props: Readonly<GoogleSheetsImportFormProps>,
): ReactNode {
  const {
    previewRows,
    dataSourceMetadata,
    isProcessing,
    onSaveSuccess,
    onRequestDataReparse,
    setDataSourceMetadata,
  } = props;
  return (
    <DatasetImportForm
      key={dataSourceMetadata.datasetLoadResult.sheetLoadMetadata.id}
      dataSourceMetadata={dataSourceMetadata}
      initialDatasetName={dataSourceMetadata.datasetLoadResult.spreadsheetName}
      isProcessing={isProcessing}
      onSaveSuccess={onSaveSuccess}
      onDataSourceMetadataChange={(metadata) => {
        setDataSourceMetadata(metadata as GoogleSheetsDataSourceMetadata);
      }}
      onRequestDataReparse={onRequestDataReparse}
      parseOptions={dataSourceMetadata.parseOptions}
      rows={previewRows}
    />
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

/**
 * Google Sheets picker plus the dataset import form after a sheet is sniffed.
 */
export function GoogleSheetsImportView({
  onSaveSuccess,
  ...props
}: Props): JSX.Element {
  const { t } = useLingui();
  const googleSheetLoad = useLoadGoogleSheet();
  const { selectedDocument, previewRows, dataSourceMetadata } = googleSheetLoad;

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
    onGoogleSheetPicked: googleSheetLoad.onGoogleSheetPicked,
    onCancel: googleSheetLoad.onPickerCancel,
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

        {isLoadingGoogleAuthState ? (
          <Loader />
        ) : isGoogleAuthenticated ? (
          <>
            {selectedGoogleAccount ? (
              <Text>
                <Trans>
                  You have successfully connected to{" "}
                  {selectedGoogleAccount.google_email}
                </Trans>
              </Text>
            ) : null}

            {isPreparingPicker ? (
              <Loader />
            ) : (
              <Button
                onClick={() => {
                  _openGooglePicker({
                    picker,
                    onUnavailable: notifyPickerCouldNotOpen,
                  });
                }}
              >
                <Trans>Pick google sheet</Trans>
              </Button>
            )}

            {selectedDocument ? (
              <>
                <Text>
                  <Trans>Selected document: {selectedDocument.name}</Trans>
                </Text>
                {googleSheetLoad.isLoadingSheet ? <Loader /> : null}
              </>
            ) : null}
          </>
        ) : (
          <Button
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
        )}

        {previewRows &&
        dataSourceMetadata &&
        googleSheetLoad.exportedWorkbook ? (
          <_GoogleSheetsImportForm
            previewRows={previewRows}
            dataSourceMetadata={dataSourceMetadata}
            isProcessing={
              googleSheetLoad.isExportingSheet || googleSheetLoad.isLoadingSheet
            }
            onSaveSuccess={onSaveSuccess}
            onRequestDataReparse={googleSheetLoad.onRequestDataReparse}
            setDataSourceMetadata={googleSheetLoad.setDataSourceMetadata}
          />
        ) : null}
      </Stack>
    </Box>
  );
}
