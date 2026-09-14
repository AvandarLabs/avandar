import { getCurrentUrl, navigateToExternalUrl } from "@avandar/browser-utils";
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
import { IconBrandGoogleDrive } from "@tabler/icons-react";
import { useCallback } from "react";
import { APIClient } from "@/clients/APIClient";
import {
  FEATUREBASE_FEATURE_REQUEST_BOARD,
  openFeaturebaseFeedbackWidget,
} from "@/components/buttons/FeedbackButton/openFeaturebaseFeedbackWidget";
import { useGooglePicker } from "@/hooks/ui/useGooglePicker";
import { Logger } from "@/utils/Logger";
import { notifyError } from "@/utils/notifications/notify";
import { ConnectorRow } from "@/views/DataManagerApp/DataImportView/ConnectorRow/ConnectorRow";
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
 *
 * The available services read as a list of rows rather than as loose text and
 * buttons, so a second connector is a second row instead of a second layout.
 * The note about which services are coming sits at the end as a dimmed line:
 * it is a standing advisory, and a warning panel on every visit trains people
 * to stop reading warning panels.
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

  const onConnect = async (): Promise<void> => {
    try {
      const { authorizeURL } = await APIClient.get({
        queryParams: { redirectURL: getCurrentUrl() },
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
  };

  const connectorStatus = isGoogleAuthenticated ? (
    selectedGoogleAccount ? (
      <Trans>Connected as {selectedGoogleAccount.google_email}</Trans>
    ) : (
      <Trans>Connected</Trans>
    )
  ) : (
    <Trans>Import one tab of a spreadsheet in your Google Drive</Trans>
  );

  const connectorAction = isLoadingGoogleAuthState ? (
    <Loader size="xs" />
  ) : isGoogleAuthenticated ? (
    isPreparingPicker ? (
      <Loader size="xs" />
    ) : (
      <Button
        variant="default"
        size="compact-sm"
        onClick={() => {
          _openGooglePicker({
            picker,
            onUnavailable: notifyPickerCouldNotOpen,
          });
        }}
      >
        <Trans>Pick a sheet</Trans>
      </Button>
    )
  ) : (
    <Button
      size="compact-sm"
      onClick={() => {
        void onConnect();
      }}
    >
      <Trans>Connect</Trans>
    </Button>
  );

  return (
    <Box {...props}>
      <Stack gap="xl">
        <Stack gap="sm">
          <ConnectorRow
            icon={<IconBrandGoogleDrive size={20} stroke={1.6} aria-hidden />}
            name={<Trans>Google Sheets</Trans>}
            status={connectorStatus}
            action={connectorAction}
          />

          {pickedSheet ? (
            <Group gap="sm" align="flex-end" wrap="wrap">
              <Text size="sm">
                <Trans>Selected document: {pickedSheet.spreadsheetName}</Trans>
              </Text>
              {googleSheetLoad.isListingTabs ? <Loader size="xs" /> : null}
            </Group>
          ) : null}

          {pickedSheet && hasTabChoice ? (
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
                variant="default"
                onClick={googleSheetLoad.onProcessSelectedTab}
                loading={googleSheetLoad.isLoadingSheet}
              >
                <Trans>Process</Trans>
              </Button>
            </Group>
          ) : pickedSheet && googleSheetLoad.isLoadingSheet ? (
            <Loader size="xs" />
          ) : null}

          <Text size="xs" c="dimmed" maw="65ch">
            <Trans>
              New connectors are added every month. If there is a database or
              service you need,{" "}
              <UnstyledButton
                type="button"
                aria-label={t`Request a data source connection via feedback`}
                display="inline"
                p={0}
                h="auto"
                td="underline"
                c="primary"
                fz="xs"
                fw={500}
                style={{ verticalAlign: "baseline" }}
                onClick={() => {
                  openFeaturebaseFeedbackWidget({
                    boardName: FEATUREBASE_FEATURE_REQUEST_BOARD,
                  });
                }}
              >
                tell us so we can prioritize it
              </UnstyledButton>
              .
            </Trans>
          </Text>
        </Stack>

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
