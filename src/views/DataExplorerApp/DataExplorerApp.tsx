import {
  Box,
  Button,
  Flex,
  Group,
  LoadingOverlay,
  MantineTheme,
  Menu,
  Stack,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import {
  IconChevronDown,
  IconDownload,
  IconInfoCircle,
} from "@tabler/icons-react";
import { notifyError, notifyNotImplemented } from "@ui/index";
import { Tooltip } from "@ui/Tooltip/Tooltip";
import { isEpochMs, isISODateString, prop } from "@utils/index";
import { AvaDataTypes } from "$/models/datasets/AvaDataType/AvaDataTypes";
import { AppLayout } from "@/components/common/layouts/AppLayout/AppLayout";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { DataExplorerStateManager } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager";
import { downloadRowsAsCSV } from "@/views/DataExplorerApp/downloadRowsAsCSV";
import { QueryForm } from "@/views/DataExplorerApp/QueryForm/QueryForm";
import { SaveAsNewDatasetForm } from "@/views/DataExplorerApp/SaveAsNewDatasetForm/SaveAsNewDatasetForm";
import { useDataQuery } from "@/views/DataExplorerApp/useDataQuery";
import { VisualizationContainer } from "@/views/DataExplorerApp/VisualizationContainer";
import { VizSettingsForm } from "@/views/DataExplorerApp/VizSettingsForm/VizSettingsForm";

const QUERY_FORM_WIDTH = 300;

export function DataExplorerApp(): JSX.Element {
  const state = DataExplorerStateManager.useState();
  const workspace = useCurrentWorkspace();
  const [queryResults, isLoadingResults] = useDataQuery({
    query: state.query,
    rawSQL: state.rawSQL,
    auth: "workspace",
    workspaceId: workspace.id,
  });
  const queryResultColumns = queryResults?.columns ?? [];
  const queryResultData = queryResults?.data ?? [];
  const dateColumns = new Set(
    queryResultColumns
      .filter((f) => {
        const sampleVal = queryResultData[0]?.[f.name];
        return (
          AvaDataTypes.isTemporal(f.dataType) ||
          isISODateString(sampleVal) ||
          isEpochMs(sampleVal)
        );
      })
      .map(prop("name")),
  );

  return (
    <AppLayout title="Data Explorer">
      <Flex>
        <Box
          bg="neutral.0"
          miw={QUERY_FORM_WIDTH}
          w={QUERY_FORM_WIDTH}
          mih="100dvh"
          mah="100vh"
          style={styles.queryFormContainer}
        >
          <QueryForm />
          <VizSettingsForm columns={queryResultColumns} />
        </Box>

        <Stack flex={1} gap={0}>
          <Group
            bg="white"
            py="xs"
            w="100%"
            justify="flex-end"
            px="md"
            style={styles.toolbar}
          >
            <Menu shadow="md" width={180}>
              <Menu.Target>
                <Button
                  variant="outline"
                  color="neutral"
                  size="compact-sm"
                  rightSection={<IconChevronDown size={16} />}
                >
                  Save As
                </Button>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item
                  disabled={queryResultData.length === 0}
                  onClick={() => {
                    if (!state.rawSQL) {
                      notifyError(
                        "Saving a new dataset is only supported for AI queries",
                      );
                      return;
                    }
                    const modalId = modals.open({
                      title: "Save As New Dataset",
                      size: "xl",
                      children: (
                        <SaveAsNewDatasetForm
                          queryResultData={queryResultData}
                          columns={queryResultColumns}
                          dateColumns={dateColumns}
                          rawSQL={state.rawSQL}
                          onSaveSuccess={() => {
                            modals.close(modalId);
                          }}
                        />
                      ),
                    });
                  }}
                >
                  New Dataset
                </Menu.Item>
                <Menu.Item
                  disabled
                  onClick={() => {
                    notifyNotImplemented();
                  }}
                  rightSection={
                    <Tooltip label="This feature is not implemented yet.">
                      <IconInfoCircle size={16} />
                    </Tooltip>
                  }
                >
                  Dashboard Block
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
            <Button
              variant="outline"
              color="neutral"
              leftSection={<IconDownload size={16} />}
              size="compact-sm"
              disabled={isLoadingResults || queryResultData.length === 0}
              onClick={() => {
                downloadRowsAsCSV(queryResultData);
              }}
            >
              Export
            </Button>
          </Group>
          <Box flex={1} pos="relative" w="100%" h="100%" bg="white">
            <LoadingOverlay visible={isLoadingResults} zIndex={99} />
            <VisualizationContainer
              columns={queryResultColumns}
              data={queryResultData}
              dateColumns={dateColumns}
            />
          </Box>
        </Stack>
      </Flex>
    </AppLayout>
  );
}

const styles = {
  queryFormContainer: (theme: MantineTheme) => {
    return {
      borderRight: `1px solid ${theme.colors.neutral[2]}`,
      overflowY: "auto",
    };
  },
  toolbar: (theme: MantineTheme) => {
    return {
      borderBottom: `1px solid ${theme.colors.neutral[2]}`,
    };
  },
};
