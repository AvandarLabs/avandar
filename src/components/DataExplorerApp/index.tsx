import { Box, Flex, LoadingOverlay, MantineTheme } from "@mantine/core";
import { useMemo } from "react";
import { partition } from "@/lib/utils/arrays/misc";
import { getProp } from "@/lib/utils/objects/higherOrderFuncs";
import { isNotInSet } from "@/lib/utils/sets/higherOrderFuncs";
import { wrapString } from "@/lib/utils/strings/higherOrderFuncs";
import { wordJoin } from "@/lib/utils/strings/transformations";
import { useDataExplorerContext } from "./DataExplorerContext/";
import { QueryForm } from "./QueryForm";
import { useDataQuery } from "./useDataQuery";
import { VisualizationContainer } from "./VisualizationContainer";
import { VizSettingsForm } from "./VizSettingsForm";

const QUERY_FORM_WIDTH = 300;

export function DataExplorerApp(): JSX.Element {
  const {
    aggregations,
    setAggregations,
    selectedDataSource,
    onSelectedDataSourceChange,
    selectedColumns,
    setSelectedColumns,
    selectedGroupByColumns,
    setSelectedGroupByColumns,
    orderByColumn,
    setOrderByColumn,
    orderByDirection,
    setOrderByDirection,
    vizConfig,
    setVizConfig,
  } = useDataExplorerContext();

  const selectedColumnNames = useMemo(() => {
    return selectedColumns.map(getProp("value.name"));
  }, [selectedColumns]);

  const selectedGroupByColNames = useMemo(() => {
    return selectedGroupByColumns.map(getProp("value.name"));
  }, [selectedGroupByColumns]);

  const [isValidQuery, errorMessage] = useMemo(() => {
    // 1. There must be at least one column selected
    if (selectedColumnNames.length === 0) {
      return [
        false,
        "At least one column must be selected for the query to run",
      ] as const;
    }

    // 2. If there is at least 1 GROUP BY or at least 1 aggregated column, then
    // ALL columns must be either in the GROUP BY or have an aggregation.
    const [nonAggregatedColNames, aggregatedColNames] = partition(
      selectedColumnNames,
      (name) => {
        return aggregations[name] === "none";
      },
    );

    if (
      aggregatedColNames.length !== 0 ||
      selectedGroupByColNames.length !== 0
    ) {
      const groupByColNames = new Set(selectedGroupByColNames);
      const colsWithoutGroupByOrAggregation = nonAggregatedColNames.filter(
        isNotInSet(groupByColNames),
      );

      if (colsWithoutGroupByOrAggregation.length > 0) {
        // generate the error message
        const colNamesListStr = wordJoin(
          colsWithoutGroupByOrAggregation.map(wrapString('"')),
        );
        const needs =
          colsWithoutGroupByOrAggregation.length === 1 ?
            `Column ${colNamesListStr} needs`
          : `Columns ${colNamesListStr} need`;

        const errMsg =
          `If one column is in the Group By or has an aggregation, ` +
          `then all columns must be in the Group By or have an aggregation. ` +
          `${needs} to be added to the Group By or have an aggregation.`;

        return [false, errMsg] as const;
      }
    }

    return [true, undefined] as const;
  }, [selectedColumnNames, selectedGroupByColNames, aggregations]);

  const [queryResults, isLoadingResults] = useDataQuery({
    enabled: !!selectedDataSource && isValidQuery,
    aggregations,
    dataSource: selectedDataSource,
    selectColumns: selectedColumns,
    groupByColumns: selectedGroupByColumns,
    orderByColumn,
    orderByDirection,
  });

  const { fields, data } = useMemo(() => {
    return {
      fields: queryResults?.columns ?? [],
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
          selectedDataSource={selectedDataSource}
          selectedColumns={selectedColumns}
          selectedGroupByColumns={selectedGroupByColumns}
          orderByColumn={orderByColumn}
          orderByDirection={orderByDirection}
          onAggregationsChange={setAggregations}
          onSelectDataSourceChange={onSelectedDataSourceChange}
          onSelectColumnsChange={setSelectedColumns}
          onGroupByChange={setSelectedGroupByColumns}
          onOrderByColumnChange={setOrderByColumn}
          onOrderByDirectionChange={setOrderByDirection}
          errorMessage={errorMessage}
        />

        <VizSettingsForm
          columns={fields}
          vizConfig={vizConfig}
          onVizConfigChange={setVizConfig}
        />
      </Box>

      <Box pos="relative" flex={1} px="sm" py="md">
        <LoadingOverlay visible={isLoadingResults} zIndex={99} />
        <VisualizationContainer
          vizConfig={vizConfig}
          columns={fields}
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
