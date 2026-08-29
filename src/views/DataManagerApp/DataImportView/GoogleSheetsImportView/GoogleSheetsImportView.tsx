import { getCurrentUrl, navigateToExternalUrl } from "@avandar/browser-utils";
import { Callout } from "@avandar/ui";
import { Trans, useLingui } from "@lingui/react/macro";
import {
  Box,
  BoxProps,
  Button,
  Group,
  Loader,
  Select,
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
import type { GPicker, GPickerResponseObject } from "@/lib/types/google-picker";
import type { GoogleSheetsDataSourceMetadata } from "@/views/DataManagerApp/DataImportView/DatasetImportForm/DatasetImportForm.types";

type Props = BoxProps & {
  /**
   * When set, this callback is invoked with the newly saved dataset instead
   * of the default navigation to the dataset detail page.
   */
  onSaveSuccess?: (dataset: Dataset.T) => void;
};

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
  const { pickedSheet, availableTabs, previewRows, dataSourceMetadata } =
    googleSheetLoad;

  // Asked only when there is something to ask: a one-tab workbook imports on
  // the pick, because one Avandar dataset is one tab and there is only one.
  //
  // Withdrawn once a tab has been imported, because from then on the import
  // form carries its own tab selector. Two controls for one choice is worse
  // than either alone: they can disagree, and only one of them re-parses.
  const hasTabChoice =
    (availableTabs?.length ?? 0) > 1 && dataSourceMetadata === undefined;

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

            {pickedSheet ? (
              <>
                <Text>
                  <Trans>
                    Selected document: {pickedSheet.spreadsheetName}
                  </Trans>
                </Text>
                {googleSheetLoad.isListingTabs ? <Loader /> : null}
                {hasTabChoice ? (
                  <Group align="flex-end" gap="sm">
                    <Select
                      label={t`Tab to import`}
                      description={t`One dataset is one tab.`}
                      data={(availableTabs ?? []).map((tab) => {
                        return { value: String(tab.sheetId), label: tab.title };
                      })}
                      value={
                        googleSheetLoad.selectedTabId === undefined
                          ? null
                          : String(googleSheetLoad.selectedTabId)
                      }
                      onChange={(value) => {
                        if (value !== null) {
                          googleSheetLoad.setSelectedTabId(Number(value));
                        }
                      }}
                    />
                    <Button
                      onClick={googleSheetLoad.onProcessSelectedTab}
                      loading={googleSheetLoad.isLoadingSheet}
                    >
                      <Trans>Process</Trans>
                    </Button>
                  </Group>
                ) : googleSheetLoad.isLoadingSheet ? (
                  <Loader />
                ) : null}
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

        {previewRows && dataSourceMetadata && pickedSheet ? (
          <DatasetImportForm
            key={dataSourceMetadata.datasetLoadResult.id}
            initialDatasetName={
              dataSourceMetadata.datasetLoadResult.spreadsheetName
            }
            rows={previewRows}
            dataSourceMetadata={dataSourceMetadata}
            parseOptions={dataSourceMetadata.parseOptions}
            onSaveSuccess={onSaveSuccess}
            onDataSourceMetadataChange={(metadata) => {
              googleSheetLoad.setDataSourceMetadata(
                metadata as GoogleSheetsDataSourceMetadata,
              );
            }}
            isProcessing={googleSheetLoad.isLoadingSheet}
            onRequestDataReparse={googleSheetLoad.onRequestDataReparse}
          />
        ) : null}
      </Stack>
    </Box>
  );
}
