import { Box, Flex, Loader, MantineTheme } from "@mantine/core";
import { useMemo, useState } from "react";
import { QueryAggregationType } from "@/clients/LocalDatasetQueryClient";
import { getProp } from "@/lib/utils/objects/higherOrderFuncs";
import { DatasetId } from "@/models/datasets/Dataset";
import { DatasetColumn } from "@/models/datasets/DatasetColumn";
import { QueryForm } from "./QueryForm";
import { useDataQuery } from "./useDataQuery";
import { VisualizationContainer } from "./VisualizationContainer";
import { VizSettingsForm } from "./VizSettingsForm";
import {
  makeDefaultVizConfig,
  VizConfig,
} from "./VizSettingsForm/makeDefaultVizConfig";

const QUERY_FORM_WIDTH = 300;

export function DataExplorerApp(): JSX.Element {
  const [aggregations, setAggregations] = useState<
    // field name -> query aggregation type
    Record<string, QueryAggregationType>
  >({});
  const [selectedDatasetId, setSelectedDatasetId] = useState<
    DatasetId | undefined
  >(undefined);
  const [selectColumns, setSelectedFields] = useState<readonly DatasetColumn[]>(
    [],
  );
  const [selectGroupByColumns, setSelectedGroupByFields] = useState<
    readonly DatasetColumn[]
  >([]);
  const [orderByColumn, setOrderByColumn] = useState<DatasetColumn | undefined>(
    undefined,
  );

  const [orderByDirection, setOrderByDirection] = useState<"asc" | "desc">(
    "asc",
  );
  const [vizConfig, setVizConfig] = useState<VizConfig>(() => {
    return makeDefaultVizConfig("table");
  });

  const selectedFieldNames = useMemo(() => {
    return selectColumns.map(getProp("name"));
  }, [selectColumns]);
  // const selectedGroupByFieldNames = useMemo(() => {
  //   return selectGroupByColumns.map(getProp("name"));
  // }, [selectGroupByColumns]);

  const [isValidQuery, errorMessage] = useMemo(() => {
    if (selectedFieldNames.length === 0) {
      return [
        false,
        "At least one column must be selected for the query to run",
      ] as const;
    }
    // We no longer enforce “every selected col must be grouped or aggregated”.
    // The backend auto–groups non-aggregated
    // selected fields when any agg exists.
    return [true, undefined] as const;
  }, [selectedFieldNames]);

  const [queryResults, isLoadingResults] = useDataQuery({
    enabled: !!selectedDatasetId && isValidQuery,
    aggregations,
    datasetId: selectedDatasetId,
    selectFields: selectColumns,
    groupByFields: selectGroupByColumns,
    orderByColumn,
    orderByDirection,
  });

  const { fields, data } = useMemo(() => {
    return {
      fields: queryResults?.fields ?? [],
      data: queryResults?.data ?? [],
    };
  }, [queryResults]);

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
        <QueryForm
          aggregations={aggregations}
          selectedDatasetId={selectedDatasetId}
          selectedColumns={selectColumns}
          orderByColumn={orderByColumn}
          onAggregationsChange={setAggregations}
          onFromDatasetChange={setSelectedDatasetId}
          onSelectColumnsChange={setSelectedFields}
          onGroupByChange={setSelectedGroupByFields}
          onOrderByColumnChange={setOrderByColumn}
          orderByDirection={orderByDirection}
          onOrderByDirectionChange={setOrderByDirection}
          errorMessage={errorMessage}
        />
        <VizSettingsForm
          fields={fields}
          vizConfig={vizConfig}
          onVizConfigChange={setVizConfig}
        />
      </Box>
      <Box pos="relative" flex={1} px="sm" py="md">
        {isLoadingResults ?
          <Loader />
        : null}
        <VisualizationContainer
          vizConfig={vizConfig}
          fields={fields}
          data={data}
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
