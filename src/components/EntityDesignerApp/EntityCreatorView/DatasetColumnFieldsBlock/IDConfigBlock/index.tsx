import { Group, Loader, Select, Stack, Text } from "@mantine/core";
import { useMemo } from "react";
import { makeSelectOptions } from "@/lib/ui/inputs/Select/makeSelectOptions";
import { where } from "@/lib/utils/filters/filterBuilders";
import { isNotUndefined } from "@/lib/utils/guards";
import { identity } from "@/lib/utils/misc";
import { makeObjectFromList } from "@/lib/utils/objects/builders";
import { getProp } from "@/lib/utils/objects/higherOrderFuncs";
import { LocalDatasetClient } from "@/models/LocalDataset/LocalDatasetClient";
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
  const { fields } = entityConfigForm.getTransformedValues();

  const datasetsToPullFrom = useMemo(() => {
    return [
      ...new Set(
        datasetColumnFields
          .map(getProp("extractors.datasetColumnValue.datasetId"))
          .filter(isNotUndefined),
      ),
    ];
  }, [datasetColumnFields]);

  // these are the fields that are eligible to be used as the entity ID or title
  const possibleIdFieldsByDatasetId = useMemo(() => {
    return makeObjectFromList(datasetsToPullFrom, {
      keyFn: identity,
      valueFn: (datasetId) => {
        // get all fields that extract from this dataset
        return makeSelectOptions(
          datasetColumnFields.filter((field) => {
            return field.extractors.datasetColumnValue.datasetId === datasetId;
          }),
          { valueFn: getProp("id"), labelFn: getProp("name") },
        );
      },
    });
  }, [datasetsToPullFrom, datasetColumnFields]);

  const [localDatasets, loadingLocalDatasets] = LocalDatasetClient.useGetAll({
    ...where("id", "in", datasetsToPullFrom),
    useQueryOptions: { enabled: datasetsToPullFrom.length > 0 },
  });

  return (
    <Stack>
      {loadingLocalDatasets ?
        <Loader />
      : localDatasets?.map((dataset) => {
          const possibleIdFields = possibleIdFieldsByDatasetId[dataset.id];
          if (!possibleIdFields) {
            return null;
          }

          return (
            <Group>
              <Text key={dataset.id}>{dataset.name}</Text>
              <Select
                required
                key={entityConfigForm.key(`idFieldsByDatasetId.${dataset.id}`)}
                data={possibleIdFields}
                placeholder={
                  fields.length === 0 ?
                    "No fields have been configured yet"
                  : "Select a field"
                }
                label={`What field should be used as a ${entityConfigName}'s ID?`}
                {...entityConfigForm.getInputProps(
                  `idFieldsByDatasetId.${dataset.id}`,
                )}
              />
            </Group>
          );
        })
      }
    </Stack>
  );
}
