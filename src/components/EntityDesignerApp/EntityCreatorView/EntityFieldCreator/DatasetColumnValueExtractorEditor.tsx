import { Group, Select } from "@mantine/core";
import { useState } from "react";
import { LocalDatasetFieldSelect } from "@/components/common/LocalDatasetFieldSelect";
import { LocalDatasetSelect } from "@/components/common/LocalDatasetSelect";
import { FormType } from "@/lib/hooks/ui/useForm";
import { makeSelectOptions } from "@/lib/ui/inputs/Select/makeSelectOptions";
import { getProp, objectValues } from "@/lib/utils/objects";
import { ValuePickerRuleTypes } from "@/models/EntityConfig/ValueExtractor/DatasetColumnValueExtractor/constants";
import { LocalDatasetId } from "@/models/LocalDataset/types";
import { EntityConfigForm } from "../entityCreatorTypes";

type Props = {
  entityConfigForm: FormType<EntityConfigForm>;
  fieldIdx: number;
};

const valuePickerOptions = makeSelectOptions({
  list: objectValues(ValuePickerRuleTypes),
  valueFn: getProp("type"),
  labelFn: getProp("displayName"),
});

export function DatasetColumnValueExtractorEditor({
  entityConfigForm,
  fieldIdx,
}: Props): JSX.Element {
  const basePath = `fields.${fieldIdx}.datasetColumnValueExtractor` as const;
  const [keys, inputProps] = entityConfigForm.keysAndProps(basePath, [
    "datasetId",
    "datasetFieldId",
    "valuePickerRuleType",
  ]);

  const [datasetId, setDatasetId] = useState<LocalDatasetId | undefined>(
    undefined,
  );

  entityConfigForm.watch(`${basePath}.datasetId`, ({ value }) => {
    setDatasetId(value);
  });

  return (
    <Group>
      <LocalDatasetSelect
        key={keys.datasetId}
        label="Dataset"
        allowDeselect={false}
        {...inputProps.datasetId()}
      />
      <LocalDatasetFieldSelect
        key={keys.datasetFieldId}
        label="Field"
        datasetId={datasetId}
        allowDeselect={false}
        {...inputProps.datasetFieldId()}
      />
      <Select
        key={keys.valuePickerRuleType}
        label="Value picker rule"
        data={valuePickerOptions}
        allowDeselect={false}
        {...inputProps.valuePickerRuleType()}
      />
    </Group>
  );
}
