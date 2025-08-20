import { Loader, Select, Stack, Text } from "@mantine/core";
import { useMemo } from "react";
import { DatasetClient } from "@/clients/datsets/DatasetClient";
import { makeSelectOptions } from "@/lib/ui/inputs/Select/makeSelectOptions";
import { where } from "@/lib/utils/filters/filterBuilders";
import { isNotUndefined } from "@/lib/utils/guards";
import { makeObjectFromList } from "@/lib/utils/objects/builders";
import { getProp } from "@/lib/utils/objects/higherOrderFuncs";
import { EntityConfigFormType } from "../../entityConfigFormTypes";

type Props = {
  entityConfigForm: EntityConfigFormType;
  entityConfigName: string;
};

export function IDConfigBlock({
  entityConfigForm,
  entityConfigName,
}: Props): JSX.Element {
  const { datasetColumnFields } = entityConfigForm.getValues();

  const datasetIdsToPullFrom = useMemo(() => {
    return [
      ...new Set(
        datasetColumnFields
          .map(getProp("extractors.datasetColumnValue.datasetId"))
          .filter(isNotUndefined),
      ),
    ];
  }, [datasetColumnFields]);

  const [datasets, isLoadingDatasets] =
    DatasetClient.useGetAllDatasetsWithColumns({
      ...where("id", "in", datasetIdsToPullFrom),
      useQueryOptions: { enabled: datasetIdsToPullFrom.length > 0 },
    });

  // these are the fields that are eligible to be used as the entity ID or title
  const fieldOptionsByDatasetId = useMemo(() => {
    return makeObjectFromList(datasets ?? [], {
      keyFn: getProp("id"),
      valueFn: (dataset) => {
        return makeSelectOptions(dataset.columns, {
          valueFn: getProp("id"),
          labelFn: getProp("name"),
        });
      },
    });
  }, [datasets]);

  const { sourceDatasets } = entityConfigForm.getValues();

  return (
    <Stack>
      {isLoadingDatasets ?
        <Loader />
      : <>
          {sourceDatasets.length > 1 ?
            <Text>
              We should join data into the same {entityConfigName} when...
            </Text>
          : null}
          {sourceDatasets.map(({ dataset }, idx) => {
            const fieldOptions = fieldOptionsByDatasetId[dataset.id];
            if (!fieldOptions) {
              return null;
            }

            return (
              <Select
                required
                key={entityConfigForm.key(
                  `sourceDatasets.${idx}.primaryKeyColumnId`,
                )}
                data={fieldOptions}
                placeholder="Select a field"
                label={
                  sourceDatasets.length === 1 ?
                    <Text span>
                      For dataset{" "}
                      <Text span fw="bold">
                        {dataset.name}
                      </Text>{" "}
                      this column should be used as a {entityConfigName}'s ID
                    </Text>
                  : idx === 0 ?
                    <Text span>
                      The values of{" "}
                      <Text span fw="bold">
                        {dataset.name}
                      </Text>
                    </Text>
                  : <Text span>
                      {idx > 1 ? "and " : ""}are equal to the values of{" "}
                      <Text span fw="bold">
                        {dataset.name}
                      </Text>
                    </Text>

                }
                {...entityConfigForm.getInputProps(
                  `sourceDatasets.${idx}.primaryKeyColumnId`,
                )}
              />
            );
          })}
        </>
      }
    </Stack>
  );
}
