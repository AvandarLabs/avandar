import { Group, Select } from "@mantine/core";
import { useState } from "react";
import { LocalDatasetColumnSelect } from "@/components/common/LocalDatasetColumnSelect";
import { LocalDatasetSelect } from "@/components/common/LocalDatasetSelect";
import { FormType } from "@/lib/hooks/ui/useForm";
import { makeSelectOptions } from "@/lib/ui/inputs/Select/makeSelectOptions";
import { getProp } from "@/lib/utils/objects/higherOrderFuncs";
import { objectValues } from "@/lib/utils/objects/misc";
import { ValuePickerRuleTypes } from "@/models/EntityConfig/ValueExtractor/DatasetColumnValueExtractor/constants";
import { LocalDatasetId } from "@/models/LocalDataset/types";
import { EntityConfigFormValues } from "../entityCreatorTypes";

type Props = {
  entityConfigForm: FormType<EntityConfigFormValues>;
  fieldIdx: number;
};

const valuePickerOptions = makeSelectOptions(
  objectValues(ValuePickerRuleTypes),
  {
    valueFn: getProp("type"),
    labelFn: getProp("displayName"),
  },
);

export function DatasetColumnValueExtractorEditor({
  entityConfigForm,
  fieldIdx,
}: Props): JSX.Element {
  const basePath = `fields.${fieldIdx}.extractors.datasetColumnValue` as const;
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
      <LocalDatasetColumnSelect
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
