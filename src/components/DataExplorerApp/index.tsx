import { Box, Flex, Loader, MantineTheme } from "@mantine/core";
import { useMemo } from "react";
import { partition } from "@/lib/utils/arrays";
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
    selectedDatasetId,
    onSelectDatasetChange,
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

  const selectedFieldNames = useMemo(() => {
    return selectedColumns.map(getProp("name"));
  }, [selectedColumns]);

  const selectedGroupByFieldNames = useMemo(() => {
    return selectedGroupByColumns.map(getProp("name"));
  }, [selectedGroupByColumns]);

  const [isValidQuery, errorMessage] = useMemo(() => {
    if (selectedFieldNames.length === 0) {
      return [
        false,
        "At least one column must be selected for the query to run",
      ] as const;
    }

    const [nonAgg, agg] = partition(selectedFieldNames, (name) => {
      return aggregations[name] === "none";
    });

    if (agg.length !== 0 || selectedGroupByFieldNames.length !== 0) {
      const groupBySet = new Set(selectedGroupByFieldNames);
      const missing = nonAgg.filter(isNotInSet(groupBySet));

      if (missing.length > 0) {
        const list = wordJoin(missing.map(wrapString('"')));
        const needs =
          missing.length === 1 ?
            `Column ${list} needs`
          : `Columns ${list} need`;

        const msg =
          `If one column is in the Group By or has an aggregation, ` +
          `then all columns must be in the Group By or have an aggregation. ` +
          `${needs} to be added to the Group By or have an aggregation.`;

        return [false, msg] as const;
      }
    }

    return [true, undefined] as const;
  }, [selectedFieldNames, selectedGroupByFieldNames, aggregations]);

  const [queryResults, isLoadingResults] = useDataQuery({
    enabled: !!selectedDatasetId && isValidQuery,
    aggregations,
    datasetId: selectedDatasetId,
    selectFields: selectedColumns,
    groupByFields: selectedGroupByColumns,
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
          selectedColumns={selectedColumns}
          selectedGroupByColumns={selectedGroupByColumns}
          orderByColumn={orderByColumn}
          orderByDirection={orderByDirection}
          onAggregationsChange={setAggregations}
          onSelectDatasetChange={onSelectDatasetChange}
          onSelectColumnsChange={setSelectedColumns}
          onGroupByChange={setSelectedGroupByColumns}
          onOrderByColumnChange={setOrderByColumn}
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
