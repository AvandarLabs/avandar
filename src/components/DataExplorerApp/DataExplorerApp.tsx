import { Box, Fieldset, Select, Stack, Text } from "@mantine/core";
import { useMemo, useState } from "react";
import { AggregationType, LocalQueryClient } from "@/clients/LocalQueryClient";
import { useSet } from "@/lib/hooks/useSet";
import { DataGrid } from "@/lib/ui/DataGrid";
import { LoadingOverlay } from "@/lib/ui/LoadingOverlay";
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

const HIDE_WHERE = true;
const HIDE_ORDER_BY = true;
const HIDE_LIMIT = true;

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

  const [queryResults, isLoadingResults] = useDataQuery({
    enabled: !!selectedDatasetId && loadedDatasets.has(selectedDatasetId),
    aggregations,
    datasetId: selectedDatasetId,
    selectFieldNames: selectedFieldNames,
    groupByFieldNames: selectedGroupByFieldNames,
  });

  return (
    <Stack px="md" py="lg">
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

      {selectedFields.length > 0 ?
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
      : null}

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
