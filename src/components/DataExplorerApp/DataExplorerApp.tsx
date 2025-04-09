import { Box, Fieldset, Loader, Select, Text } from "@mantine/core";
import { useMemo, useState } from "react";
import { AggregationType, LocalQueryClient } from "@/clients/LocalQueryClient";
import { useSet } from "@/lib/hooks/useSet";
import { DataGrid } from "@/lib/ui/DataGrid";
import { difference } from "@/lib/utils/arrays";
import {
  getProp,
  makeObjectFromKeys,
  objectKeys,
  omit,
} from "@/lib/utils/objects";
import { DatasetField } from "@/models/DatasetField";
import { DatasetId, LocalDataset } from "@/models/LocalDataset";
import { useLocalDatasets } from "../DataManagerApp/queries";
import { FieldSelect } from "./FieldSelect";
import { useDataQuery } from "./useDataQuery";

export function DataExplorerApp(): JSX.Element {
  const [allDatasets, isLoadingDatasets] = useLocalDatasets();
  const [loadedDatasets, setLoadedDatasets] = useSet<DatasetId>();
  const [selectedDatasetId, setSelectedDatasetId] = useState<
    number | undefined
  >(undefined);
  const [selectedFields, setSelectedFields] = useState<readonly DatasetField[]>(
    [],
  );
  const [selectedGroupByFields, setSelectedGroupByFields] = useState<
    readonly DatasetField[]
  >([]);
  const [aggregations, setAggregations] = useState<
    Record<string, AggregationType>
  >({});

  const datasetOptions = useMemo(() => {
    return (allDatasets ?? []).map((dataset: LocalDataset) => {
      return { value: String(dataset.id), label: dataset.name };
    });
  }, [allDatasets]);

  const selectedFieldNames = useMemo(() => {
    return selectedFields.map(getProp("name"));
  }, [selectedFields]);
  const selectedGroupByFieldNames = useMemo(() => {
    return selectedGroupByFields.map(getProp("name"));
  }, [selectedGroupByFields]);

  const { data: queryResults, isLoading } = useDataQuery({
    enabled: !!selectedDatasetId && loadedDatasets.has(selectedDatasetId),
    aggregations,
    datasetId: selectedDatasetId,
    selectFieldNames: selectedFieldNames,
    groupByFieldNames: selectedGroupByFieldNames,
  });

  return (
    <Box px="md" py="lg">
      <FieldSelect
        label="Select fields"
        placeholder="Select fields"
        onChange={(fields) => {
          setSelectedFields(fields);
          setAggregations((prevAggregations) => {
            const incomingFieldNames = fields.map(getProp("name"));
            const prevFieldNames = objectKeys(prevAggregations);
            const droppedFieldNames = difference(
              prevFieldNames,
              incomingFieldNames,
            );

            const newDefaultAggregations = makeObjectFromKeys({
              keys: incomingFieldNames,
              defaultValue: "none" as const,
            });

            return omit({
              inputObj: { ...newDefaultAggregations, ...prevAggregations },
              keysToDelete: droppedFieldNames,
            });
          });
        }}
      />

      <Fieldset legend="Aggregations">
        {selectedFields.map((field) => {
          return (
            <Select
              key={field.id}
              label={field.name}
              placeholder="Select aggregation"
              defaultValue="none"
              data={[
                { value: "none", label: "None" },
                { value: "sum", label: "Sum" },
                { value: "avg", label: "Average" },
                { value: "count", label: "Count" },
                { value: "max", label: "Max" },
                { value: "min", label: "Min" },
              ]}
              onChange={(value: string | null) => {
                if (value === null) {
                  return;
                }
                setAggregations((prevAggregations) => {
                  return {
                    ...prevAggregations,
                    [field.name]: value as AggregationType,
                  };
                });
              }}
            />
          );
        })}
      </Fieldset>

      <Select
        allowDeselect={false}
        label="From dataset"
        placeholder={
          isLoadingDatasets ? "Loading datasets..." : "Select a dataset"
        }
        data={datasetOptions ?? []}
        value={String(selectedDatasetId)}
        onChange={async (datasetIdStr: string | null) => {
          if (datasetIdStr) {
            const datasetId = Number(datasetIdStr);
            setSelectedDatasetId(datasetId);
            if (!loadedDatasets.has(datasetId)) {
              // if we haven't loaded the dataset yet into memory, load it
              await LocalQueryClient.loadDataset(datasetId);
              setLoadedDatasets.add(datasetId);
            }
          } else {
            setSelectedDatasetId(undefined);
          }
        }}
      />

      <Text>Where (react-awesome-query-builder)</Text>
      <FieldSelect
        label="Group by"
        placeholder="Group by"
        onChange={setSelectedGroupByFields}
      />
      <Text>Order by (fields dropdown)</Text>
      <Text>Limit (number)</Text>

      {isLoading ?
        <Loader />
      : null}
      <DataGrid
        fields={queryResults?.fields.map(getProp("name")) ?? []}
        data={queryResults?.data ?? []}
      />
    </Box>
  );
}
