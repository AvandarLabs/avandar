import { Fieldset, Select, Stack, Text } from "@mantine/core";
import { QueryAggregationType } from "@/clients/LocalDatasetQueryClient";
import { DangerText } from "@/lib/ui/Text/DangerText";
import { difference } from "@/lib/utils/arrays";
import { makeObjectFromList } from "@/lib/utils/objects/builders";
import { getProp } from "@/lib/utils/objects/higherOrderFuncs";
import { objectKeys, omit } from "@/lib/utils/objects/misc";
import { setValue } from "@/lib/utils/objects/setValue";
import { LocalDatasetField } from "@/models/LocalDataset/LocalDatasetField/types";
import { LocalDatasetId } from "@/models/LocalDataset/types";
import { LocalDatasetSelect } from "../common/LocalDatasetSelect";
import { AggregationSelect } from "./AggregationSelect";
import { FieldSelect } from "./FieldSelect";

const HIDE_WHERE = true;
const HIDE_LIMIT = true;

type Direction = "asc" | "desc";

type Props = {
  errorMessage: string | undefined;
  aggregations: Record<string, QueryAggregationType>;
  selectedDatasetId: LocalDatasetId | undefined;
  selectedFields: readonly LocalDatasetField[];
  orderByField: LocalDatasetField | undefined;
  orderByDirection: "asc" | "desc";
  onAggregationsChange: (
    newAggregations: Record<string, QueryAggregationType>,
  ) => void;
  onFromDatasetChange: (datasetId: LocalDatasetId | undefined) => void;
  onSelectFieldsChange: (fields: readonly LocalDatasetField[]) => void;
  onGroupByChange: (fields: readonly LocalDatasetField[]) => void;
  onOrderByFieldChange: (field: LocalDatasetField | undefined) => void;
  onOrderByDirectionChange: (value: "asc" | "desc") => void;
};

export function QueryForm({
  errorMessage,
  aggregations,
  selectedFields,
  selectedDatasetId,
  orderByField,
  onAggregationsChange,
  onFromDatasetChange,
  onSelectFieldsChange,
  onGroupByChange,
  orderByDirection,
  onOrderByFieldChange,
  onOrderByDirectionChange,
}: Props): JSX.Element {
  return (
    <form>
      <Stack>
        <LocalDatasetSelect
          onChange={(datasetId) => {
            onFromDatasetChange(datasetId ?? undefined);
          }}
        />

        <FieldSelect
          label="Select fields"
          placeholder="Select fields"
          datasetId={selectedDatasetId}
          onChange={(fields) => {
            onSelectFieldsChange(fields);

            const prevAggregations = aggregations;
            const incomingFieldNames = fields.map(getProp("name"));
            const prevFieldNames = objectKeys(prevAggregations);
            const droppedFieldNames = difference(
              prevFieldNames,
              incomingFieldNames,
            );

            const newDefaultAggregations = makeObjectFromList(
              incomingFieldNames,
              { defaultValue: "none" as const },
            );

            onAggregationsChange(
              omit(
                { ...newDefaultAggregations, ...prevAggregations },
                droppedFieldNames,
              ),
            );
          }}
        />

        {selectedFields.length > 0 ?
          <Fieldset
            legend="Aggregations"
            style={{ backgroundColor: "rgba(255, 255, 255, 0.4)" }}
          >
            {selectedFields.map((field) => {
              return (
                <AggregationSelect
                  key={field.id}
                  column={field}
                  onChange={(aggregationType) => {
                    const newAggregations = setValue(
                      aggregations,
                      field.name,
                      aggregationType,
                    );
                    onAggregationsChange(newAggregations);
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
          onChange={onGroupByChange}
          datasetId={selectedDatasetId}
        />

        <Select
          label="Select field"
          placeholder="Select field"
          data={selectedFields.map((f) => {
            return {
              value: f.name,
              label: f.name,
            };
          })}
          value={orderByField?.name}
          onChange={(fieldName) => {
            const selected = selectedFields.find((f) => {
              return f.name === fieldName;
            });
            onOrderByFieldChange(selected);
          }}
        />

        <Select
          label="Order by"
          placeholder="Select order"
          data={[
            { value: "asc", label: "Ascending" },
            { value: "desc", label: "Descending" },
          ]}
          value={orderByDirection}
          clearable={false}
          onChange={(value) => {
            return onOrderByDirectionChange(value as Direction);
          }}
        />

        {HIDE_LIMIT ? null : <Text>Limit (number)</Text>}
        {errorMessage ?
          <DangerText>{errorMessage}</DangerText>
        : null}
      </Stack>
    </form>
  );
}
