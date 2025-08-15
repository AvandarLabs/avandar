import { Box, Flex, Loader, MantineTheme } from "@mantine/core";
import { useMemo } from "react";
import { partition } from "@/lib/utils/arrays";
import { isNotInSet } from "@/lib/utils/sets/higherOrderFuncs";
import { wrapString } from "@/lib/utils/strings/higherOrderFuncs";
import { wordJoin } from "@/lib/utils/strings/transformations";
import { QueryForm } from "./QueryForm";
import { useDataQuery } from "./useDataQuery";
import { useExplorerDraft } from "./useExplorerDraft";
import { VisualizationContainer } from "./VisualizationContainer";
import { VizSettingsForm } from "./VizSettingsForm";

const QUERY_FORM_WIDTH = 300;

export function DataExplorerApp(): JSX.Element {
  const {
    aggregations,
    setAggregations,
    selectedDatasetId,
    setSelectedDatasetId,
    selectedFields,
    setSelectedFields,
    selectedGroupByFields,
    setSelectedGroupByFields,
    vizConfig,
    setVizConfig,
  } = useExplorerDraft();

  const selectedFieldNames = useMemo(() => {
    return selectedFields.map((f) => {
      return f.name;
    });
  }, [selectedFields]);
  const selectedGroupByFieldNames = useMemo(() => {
    return selectedGroupByFields.map((f) => {
      return f.name;
    });
  }, [selectedGroupByFields]);

  const [isValidQuery, errorMessage] = useMemo(() => {
    // 1. There must be at least one field selected
    if (selectedFieldNames.length === 0) {
      return [
        false,
        "At least one column must be selected for the query to run",
      ];
    }

    // 2. If there is at least 1 GROUP BY or at least 1 aggregated column, then
    // ALL columns must be either in the GROUP BY or have an aggregation.
    const [nonAggregatedColumnNames, aggregatedColumnNames] = partition(
      selectedFieldNames,
      (columnName) => {
        return aggregations[columnName] === "none";
      },
    );

    if (
      aggregatedColumnNames.length !== 0 ||
      selectedGroupByFieldNames.length !== 0
    ) {
      const groupByColumnNames = new Set(selectedGroupByFieldNames);
      const columnsWithoutGroupOrAggregation = nonAggregatedColumnNames.filter(
        isNotInSet(groupByColumnNames),
      );
      if (columnsWithoutGroupOrAggregation.length > 0) {
        // generate the error message
        const columnsListStr = wordJoin(
          columnsWithoutGroupOrAggregation.map(wrapString('"')),
        );
        const pluralizedColumnsString =
          columnsWithoutGroupOrAggregation.length === 1 ?
            `Column ${columnsListStr} needs`
          : `Columns ${columnsListStr} need`;
        const errMsg = `If one column is in the Group By or has an aggregation,
        then all columns must be in the Group By or have an aggregation.
        ${pluralizedColumnsString} to be added to the Group By or have an aggregation.`;

        return [false, errMsg];
      }
    }

    return [true, undefined];
  }, [selectedFieldNames, selectedGroupByFieldNames, aggregations]);

  const [queryResults, isLoadingResults] = useDataQuery({
    enabled: !!selectedDatasetId && isValidQuery,
    aggregations,
    datasetId: selectedDatasetId,
    selectFields: selectedFields,
    groupByFields: selectedGroupByFields,
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
          selectedFields={selectedFields}
          selectedGroupByFields={selectedGroupByFields}
          onAggregationsChange={setAggregations}
          onFromDatasetChange={setSelectedDatasetId}
          onSelectFieldsChange={setSelectedFields}
          onGroupByChange={setSelectedGroupByFields}
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
