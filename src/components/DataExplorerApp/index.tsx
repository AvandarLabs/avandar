import { Box, Fieldset, Stack, Text } from "@mantine/core";
import { useMemo, useState } from "react";
import {
  LocalDatasetQueryClient,
  QueryAggregationType,
} from "@/clients/LocalDatasetQueryClient";
import { useMutation } from "@/lib/hooks/query/useMutation";
import { useMutableSet } from "@/lib/hooks/useMutableSet";
import { DataGrid } from "@/lib/ui/DataGrid";
import { LoadingOverlay } from "@/lib/ui/LoadingOverlay";
import { difference } from "@/lib/utils/arrays";
import { makeObjectFromKeys } from "@/lib/utils/objects/builders";
import { getProp } from "@/lib/utils/objects/higherOrderFuncs";
import { objectKeys, omit } from "@/lib/utils/objects/misc";
import { setValue } from "@/lib/utils/objects/setValue";
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
    Record<string, QueryAggregationType>
  >({});

  const selectedFieldNames = useMemo(() => {
    return selectedFields.map(getProp("name"));
  }, [selectedFields]);

  const selectedGroupByFieldNames = useMemo(() => {
    return selectedGroupByFields.map(getProp("name"));
  }, [selectedGroupByFields]);

  const [queryResults, isLoadingResults] = useDataQuery({
    enabled: !!selectedDatasetId && loadedDatasets.has(selectedDatasetId),
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
        <LoadingOverlay visible={isLoadingResults} overlayProps={{ blur: 1 }} />
        <DataGrid
          fields={queryResults?.fields.map(getProp("name")) ?? []}
          data={queryResults?.data ?? []}
        />
      </Box>
    </Stack>
  );
}
