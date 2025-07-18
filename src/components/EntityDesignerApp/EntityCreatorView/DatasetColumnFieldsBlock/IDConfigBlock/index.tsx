import { Loader, Select, Stack, Text } from "@mantine/core";
import { useMemo } from "react";
import { makeSelectOptions } from "@/lib/ui/inputs/Select/makeSelectOptions";
import { where } from "@/lib/utils/filters/filterBuilders";
import { isNotUndefined } from "@/lib/utils/guards";
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

  const datasetIdsToPullFrom = useMemo(() => {
    return [
      ...new Set(
        datasetColumnFields
          .map(getProp("extractors.datasetColumnValue.datasetId"))
          .filter(isNotUndefined),
      ),
    ];
  }, [datasetColumnFields]);

  const [localDatasets, loadingLocalDatasets] = LocalDatasetClient.useGetAll({
    ...where("id", "in", datasetIdsToPullFrom),
    useQueryOptions: { enabled: datasetIdsToPullFrom.length > 0 },
  });

  // these are the fields that are eligible to be used as the entity ID or title
  const fieldOptionsByDatasetId = useMemo(() => {
    return makeObjectFromList(localDatasets ?? [], {
      keyFn: getProp("id"),
      valueFn: (dataset) => {
        return makeSelectOptions(dataset.fields, {
          valueFn: getProp("id"),
          labelFn: getProp("name"),
        });
      },
    });
  }, [localDatasets]);

  const { sourceDatasets } = entityConfigForm.getValues();

  return (
    <Stack>
      {loadingLocalDatasets ?
        <Loader />
      : sourceDatasets.map(({ dataset }, idx) => {
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
              placeholder={
                fields.length === 0 ?
                  "No fields have been configured yet"
                : "Select a field"
              }
              label={
                <Text span>
                  For dataset{" "}
                  <Text span fw="bold">
                    {dataset.name}
                  </Text>
                  , what field should be used as a {entityConfigName}'s ID?
                </Text>
              }
              {...entityConfigForm.getInputProps(
                `sourceDatasets.${idx}.primaryKeyColumnId`,
              )}
            />
          );
        })
      }
    </Stack>
  );
}
