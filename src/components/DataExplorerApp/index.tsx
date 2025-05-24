import { Box, Fieldset, Loader, Stack, Text } from "@mantine/core";
import { useMemo, useState } from "react";
import {
  LocalDatasetQueryClient,
  QueryAggregationType,
} from "@/clients/LocalDatasetQueryClient";
import { useMutation } from "@/lib/hooks/query/useMutation";
import { useMutableSet } from "@/lib/hooks/useMutableSet";
import { DataGrid } from "@/lib/ui/DataGrid";
import { DangerText } from "@/lib/ui/Text/DangerText";
import { difference } from "@/lib/utils/arrays";
import { makeObjectFromKeys } from "@/lib/utils/objects/builders";
import { getProp } from "@/lib/utils/objects/higherOrderFuncs";
import { objectKeys, omit } from "@/lib/utils/objects/misc";
import { setValue } from "@/lib/utils/objects/setValue";
import { isNotInSet } from "@/lib/utils/sets/higherOrderFuncs";
import { wrapString } from "@/lib/utils/strings/higherOrderFuncs";
import { wordJoin } from "@/lib/utils/strings/transformations";
import { LocalDatasetField } from "@/models/LocalDataset/LocalDatasetField/types";
import { LocalDatasetId } from "@/models/LocalDataset/types";
import { LocalDatasetSelect } from "../common/LocalDatasetSelect";
import { AggregationSelect } from "./AggregationSelect";
import { FieldSelect } from "./FieldSelect";
import { useDataQuery } from "./useDataQuery";

const HIDE_WHERE = true;
const HIDE_ORDER_BY = true;
const HIDE_LIMIT = true;

export function DataExplorerApp(): JSX.Element {
  const [loadDataset] = useMutation({
    mutationFn: async (datasetId: LocalDatasetId) => {
      await LocalDatasetQueryClient.loadDataset(datasetId);
      return datasetId;
    },
    onSuccess: (datasetId: LocalDatasetId) => {
      setLoadedDatasets.add(datasetId);
      setLoadingDatasets.delete(datasetId);
    },
    onError: (error) => {
      throw error;
    },
  });

  // datasets that are in the process of being loaded into the db
  const [loadingDatasets, setLoadingDatasets] = useMutableSet<LocalDatasetId>();

  // datasets that have been loaded into db
  const [loadedDatasets, setLoadedDatasets] = useMutableSet<LocalDatasetId>();

  const [selectedDatasetId, setSelectedDatasetId] = useState<
    LocalDatasetId | undefined
  >(undefined);
  const [selectedFields, setSelectedFields] = useState<
    readonly LocalDatasetField[]
  >([]);
  const [selectedGroupByFields, setSelectedGroupByFields] = useState<
    readonly LocalDatasetField[]
  >([]);
  const [aggregations, setAggregations] = useState<
    // field name -> query aggregation type
    Record<string, QueryAggregationType>
  >({});

  const selectedFieldNames = useMemo(() => {
    return selectedFields.map(getProp("name"));
  }, [selectedFields]);

  const selectedGroupByFieldNames = useMemo(() => {
    return selectedGroupByFields.map(getProp("name"));
  }, [selectedGroupByFields]);

  const [isValidQuery, errorMessage] = useMemo(() => {
    // 1. There must be at least one field selected
    const hasFields = selectedFieldNames.length > 0;
    if (!hasFields) {
      return [
        false,
        "At least one column must be selected for the query to run",
      ];
    }

    // 2. all non-aggregated columns must be in the GROUP BY
    const groupByColumnNames = new Set(selectedGroupByFieldNames);
    const nonAggregatedColumnNames = selectedFieldNames.filter((columnName) => {
      return aggregations[columnName] === "none";
    });
    const aggregatedColumnNames = selectedFieldNames.filter((columnName) => {
      return aggregations[columnName] !== "none";
    });

    let areAggregationsAndGroupBysValid;
    let errMsg = undefined;
    if (aggregatedColumnNames.length === 0 && groupByColumnNames.size === 0) {
      // if there are no aggregations and no group-by's, that's fine
      areAggregationsAndGroupBysValid = true;
    } else {
      // if there is at least 1 group-by or at least 1 aggregated column, then
      // ALL columns must be either in the GROUP BY or have an aggregation.
      const columnsWithoutGroupOrAggregation = nonAggregatedColumnNames.filter(
        isNotInSet(groupByColumnNames),
      );
      errMsg = `If one column is in the Group By or has an aggregation, then all columns must be in the Group By or have an aggregation. Columns ${wordJoin(
        columnsWithoutGroupOrAggregation.map(wrapString('"')),
      )} need to be added to the Group By or have an aggregation.`;
      areAggregationsAndGroupBysValid =
        columnsWithoutGroupOrAggregation.length === 0;
    }

    return [hasFields && areAggregationsAndGroupBysValid, errMsg];
  }, [selectedFieldNames, selectedGroupByFieldNames, aggregations]);

  const [queryResults, isLoadingResults] = useDataQuery({
    enabled:
      !!selectedDatasetId &&
      loadedDatasets.has(selectedDatasetId) &&
      isValidQuery,
    aggregations,
    datasetId: selectedDatasetId,
    selectFieldNames: selectedFieldNames,
    groupByFieldNames: selectedGroupByFieldNames,
  });

  return (
    <Stack px="md" py="lg">
      <LocalDatasetSelect
        onChange={async (datasetId) => {
          if (datasetId) {
            setSelectedDatasetId(datasetId);
            if (
              !loadedDatasets.has(datasetId) &&
              !loadingDatasets.has(datasetId)
            ) {
              // if we haven't loaded the dataset yet into memory and it
              // isn't actively being loaded, then load it
              setLoadingDatasets.add(datasetId);
              loadDataset(datasetId);
            }
          } else {
            setSelectedDatasetId(undefined);
          }
        }}
      />

      <FieldSelect
        label="Select fields"
        placeholder="Select fields"
        datasetId={selectedDatasetId}
        onChange={(fields) => {
          setSelectedFields(fields);

          // Remove the aggregations for any fields that are no longer selected,
          // and add a default "none" aggregation for any new fields that just
          // got added
          setAggregations((prevAggregations) => {
            const incomingFieldNames = fields.map(getProp("name"));
            const prevFieldNames = objectKeys(prevAggregations);
            const droppedFieldNames = difference(
              prevFieldNames,
              incomingFieldNames,
            );

            const newDefaultAggregations = makeObjectFromKeys(
              incomingFieldNames,
              { defaultValue: "none" as const },
            );

            return omit(
              { ...newDefaultAggregations, ...prevAggregations },
              ...droppedFieldNames,
            );
          });
        }}
      />

      {selectedFields.length > 0 ?
        <Fieldset legend="Aggregations">
          {selectedFields.map((field) => {
            return (
              <AggregationSelect
                key={field.id}
                column={field}
                onChange={(aggregation) => {
                  setAggregations((prevAggregations) => {
                    return setValue(prevAggregations, field.name, aggregation);
                  });
                }}
              />
            );
          })}
        </Fieldset>
      : null}

      {HIDE_WHERE ? null : <Text>Where (react-awesome-query-builder)</Text>}
      <FieldSelect
        label="Group by"
        placeholder="Group by"
        onChange={setSelectedGroupByFields}
      />
      {HIDE_ORDER_BY ? null : <Text>Order by (fields dropdown)</Text>}
      {HIDE_LIMIT ? null : <Text>Limit (number)</Text>}

      <Box pos="relative">
        {errorMessage ?
          <DangerText>{errorMessage}</DangerText>
        : null}
        {isLoadingResults ?
          <Loader />
        : null}
        <DataGrid
          fields={queryResults?.fields.map(getProp("name")) ?? []}
          data={queryResults?.data ?? []}
        />
      </Box>
    </Stack>
  );
}
