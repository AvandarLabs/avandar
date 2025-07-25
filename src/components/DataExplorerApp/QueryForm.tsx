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
  onAggregationsChange: (
    newAggregations: Record<string, QueryAggregationType>,
  ) => void;
  onFromDatasetChange: (datasetId: LocalDatasetId | undefined) => void;
  onSelectFieldsChange: (fields: readonly LocalDatasetField[]) => void;
  onGroupByChange: (fields: readonly LocalDatasetField[]) => void;
};

/**
 * This is a presentational component that just receives QueryForm props and
 * renders the UI. It does not handle any business logic, such as checking
 * if the query is valid or running the query. The parent component should
 * handle that logic.
 */
export function QueryForm({
  errorMessage,
  aggregations,
  selectedFields,
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

            // Remove the aggregations for any fields that are no longer
            // selected, and add a default "none" aggregation for any
            // new fields that just got added
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
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.4)",
            }}
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
        {HIDE_ORDER_BY ? null : <Text>Order by (fields dropdown)</Text>}
        {HIDE_LIMIT ? null : <Text>Limit (number)</Text>}
        {errorMessage ?
          <DangerText>{errorMessage}</DangerText>
        : null}
      </Stack>
    </form>
  );
}
