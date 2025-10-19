import { Box, Flex, LoadingOverlay, MantineTheme } from "@mantine/core";
import { DataExplorerStore } from "./DataExplorerStore";
import { QueryForm } from "./QueryForm";
import { useDataQuery } from "./useDataQuery";
import { VisualizationContainer } from "./VisualizationContainer";
import { VizSettingsForm } from "./VizSettingsForm";

const QUERY_FORM_WIDTH = 300;

export function DataExplorerApp(): JSX.Element {
  const [state] = DataExplorerStore.use();
  const [queryResults, isLoadingResults] = useDataQuery({
    query: state.query,
  });
  const queryResultColumns = queryResults?.columns ?? [];
  const queryResultData = queryResults?.data ?? [];

  return (
    <Flex>
      <Box
        bg="neutral.0"
        miw={QUERY_FORM_WIDTH}
        w={QUERY_FORM_WIDTH}
        mih="100dvh"
        px="md"
        py="md"
        style={$queryFormBorder}
      >
        <QueryForm />
        <VizSettingsForm columns={queryResultColumns} />
      </Box>

      <Box pos="relative" flex={1} px="sm" py="md">
        <LoadingOverlay visible={isLoadingResults} zIndex={99} />
        <VisualizationContainer
          columns={queryResultColumns}
          data={queryResultData}
        />
      </Box>
    </Flex>
  );
}

const $queryFormBorder = (theme: MantineTheme) => {
  return {
    borderRight: `1px solid ${theme.colors.neutral[2]}`,
  };
};
