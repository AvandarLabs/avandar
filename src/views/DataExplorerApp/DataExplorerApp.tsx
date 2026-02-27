import {
  Box,
  Button,
  Flex,
  Group,
  LoadingOverlay,
  MantineTheme,
  Stack,
} from "@mantine/core";
import { IconDownload } from "@tabler/icons-react";
import { AppLayout } from "@/components/common/layouts/AppLayout";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { DataExplorerStateManager } from "./DataExplorerStateManager";
import { downloadRowsAsCSV } from "./downloadRowsAsCSV";
import { QueryForm } from "./QueryForm";
import { useDataQuery } from "./useDataQuery";
import { VisualizationContainer } from "./VisualizationContainer";
import { VizSettingsForm } from "./VizSettingsForm";

const QUERY_FORM_WIDTH = 300;

export function DataExplorerApp(): JSX.Element {
  const state = DataExplorerStateManager.useState();
  const workspace = useCurrentWorkspace();
  const [queryResults, isLoadingResults] = useDataQuery({
    query: state.query,
    rawSQL: state.rawSQL,
    workspaceId: workspace.id,
  });
  const queryResultColumns = queryResults?.columns ?? [];
  const queryResultData = queryResults?.data ?? [];

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
