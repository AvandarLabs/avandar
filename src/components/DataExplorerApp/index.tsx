import { Box, Flex, Loader, MantineTheme } from "@mantine/core";
import { useMemo, useState } from "react";
import { QueryAggregationType } from "@/clients/LocalDatasetQueryClient";
import { partition } from "@/lib/utils/arrays";
import { getProp } from "@/lib/utils/objects/higherOrderFuncs";
import { isNotInSet } from "@/lib/utils/sets/higherOrderFuncs";
import { wrapString } from "@/lib/utils/strings/higherOrderFuncs";
import { wordJoin } from "@/lib/utils/strings/transformations";
import { LocalDatasetField } from "@/models/LocalDataset/LocalDatasetField/types";
import { LocalDatasetId } from "@/models/LocalDataset/types";
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
    LocalDatasetId | undefined
  >(undefined);
  const [selectedFields, setSelectedFields] = useState<
    readonly LocalDatasetField[]
  >([]);
  const [selectedGroupByFields, setSelectedGroupByFields] = useState<
    readonly LocalDatasetField[]
  >([]);
  const [orderByField, setOrderByField] = useState<
    readonly LocalDatasetField[]
  >([]);
  const [orderByDirection, setOrderByDirection] = useState<"asc" | "desc">(
    "asc",
  );
  const [vizConfig, setVizConfig] = useState<VizConfig>(() => {
    return makeDefaultVizConfig("table");
  });

  const selectedFieldNames = useMemo(() => {
    return selectedFields.map(getProp("name"));
  }, [selectedFields]);
  const selectedGroupByFieldNames = useMemo(() => {
    return selectedGroupByFields.map(getProp("name"));
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
          onAggregationsChange={setAggregations}
          onFromDatasetChange={setSelectedDatasetId}
          onSelectFieldsChange={setSelectedFields}
          onGroupByChange={setSelectedGroupByFields}
          orderByDirection={orderByDirection}
          onOrderByFieldChange={setOrderByField}
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
