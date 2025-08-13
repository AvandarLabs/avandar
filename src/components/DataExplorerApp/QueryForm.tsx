import { Fieldset, Stack, Text } from "@mantine/core";
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
const HIDE_ORDER_BY = true;
const HIDE_LIMIT = true;

type Props = {
  errorMessage: string | undefined;
  aggregations: Record<string, QueryAggregationType>;
  selectedDatasetId: LocalDatasetId | undefined;
  selectedFields: readonly LocalDatasetField[];
  selectedGroupByFields: readonly LocalDatasetField[];
  onAggregationsChange: (next: Record<string, QueryAggregationType>) => void;
  onFromDatasetChange: (datasetId: LocalDatasetId | undefined) => void;
  onSelectFieldsChange: (fields: readonly LocalDatasetField[]) => void;
  onGroupByChange: (fields: readonly LocalDatasetField[]) => void;
};

export function QueryForm({
  errorMessage,
  aggregations,
  selectedFields,
  selectedGroupByFields,
  selectedDatasetId,
  onAggregationsChange,
  onFromDatasetChange,
  onSelectFieldsChange,
  onGroupByChange,
}: Props): JSX.Element {
  return (
    <form>
      <Stack>
        <LocalDatasetSelect
          value={selectedDatasetId ?? null}
          onChange={(datasetId) => {
            return onFromDatasetChange(datasetId ?? undefined);
          }}
        />

        <FieldSelect
          label="Select fields"
          placeholder="Select fields"
          datasetId={selectedDatasetId}
          value={selectedFields}
          onChange={(fields) => {
            onSelectFieldsChange(fields);

            // keep aggregations in sync
            const incomingFieldNames = fields.map(getProp("name"));
            const prevAggregations = aggregations;
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
                  value={aggregations[field.name] ?? "none"}
                  onChange={(aggregationType) => {
                    onAggregationsChange(
                      setValue(aggregations, field.name, aggregationType),
                    );
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
          datasetId={selectedDatasetId}
          value={selectedGroupByFields}
          onChange={onGroupByChange}
        />

        {HIDE_ORDER_BY ? null : <Text>Order by (fields dropdown)</Text>}
        {HIDE_LIMIT ? null : <Text>Limit (number)</Text>}

        {errorMessage ?
          <DangerText>{errorMessage}</DangerText>
        : null}
      </Stack>
    </form>
  );
}
