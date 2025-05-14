import {
  ActionIcon,
  Checkbox,
  Group,
  Select,
  Stack,
  TextInput,
} from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import { useState } from "react";
import { match } from "ts-pattern";
import { FormType } from "@/lib/hooks/ui/useForm";
import { ElementOf } from "@/lib/types/utilityTypes";
import { makeSelectOptions } from "@/lib/ui/inputs/Select/makeSelectOptions";
import { DangerText } from "@/lib/ui/Text/DangerText";
import { getProp } from "@/lib/utils/objects/higherOrderFuncs";
import { objectValues } from "@/lib/utils/objects/misc";
import { sortObjList } from "@/lib/utils/objects/sortObjList";
import { EntityFieldValueExtractorTypes } from "@/models/EntityConfig/EntityFieldConfig/constants";
import { EntityConfigFormValues } from "../entityCreatorTypes";
import { DatasetColumnValueExtractorEditor } from "./DatasetColumnValueExtractorEditor";

type Props = {
  entityConfigForm: FormType<EntityConfigFormValues>;
  defaultField: ElementOf<EntityConfigFormValues["fields"]>;
  idx: number;
  entityName: string;
};

const valueExtractorOptions = makeSelectOptions(
  sortObjList(objectValues(EntityFieldValueExtractorTypes), {
    sortBy: getProp("displayName"),
  }),
  {
    valueFn: getProp("type"),
    labelFn: getProp("displayName"),
  },
);

export function EntityFieldCreator({
  entityConfigForm,
  defaultField,
  idx,
  entityName,
}: Props): JSX.Element {
  const [fieldKeys, fieldInputProps] = entityConfigForm.keysAndProps(
    `fields.${idx}`,
    ["name"],
  );
  const [fieldOptionsKeys, fieldOptionsInputProps] =
    entityConfigForm.keysAndProps(`fields.${idx}.options`, [
      "isIdField",
      "isTitleField",
      "valueExtractorType",
      "allowManualEdit",
      "isArray",
    ]);

  const [valueExtractorType, setValueExtractorType] = useState(
    defaultField.options.valueExtractorType,
  );

  entityConfigForm.watch(
    `fields.${idx}.options.valueExtractorType`,
    ({ value }) => {
      setValueExtractorType(value);
    },
  );

  return (
    <Stack>
      <Group>
        <TextInput
          key={fieldKeys.name}
          required
          label="Field Name"
          placeholder="Enter a name for the field"
          flex={1}
          {...fieldInputProps.name()}
        />
        <ActionIcon
          color="red"
          onClick={() => {
            return entityConfigForm.removeListItem("fields", idx);
          }}
        >
          <IconTrash size={16} />
        </ActionIcon>
      </Group>
      <Group>
        <Checkbox
          key={fieldOptionsKeys.isIdField}
          label={`This is the ${entityName}'s ID`}
          {...fieldOptionsInputProps.isIdField({ type: "checkbox" })}
        />
        <Checkbox
          key={fieldOptionsKeys.isTitleField}
          label={`This is the ${entityName}'s title`}
          {...fieldOptionsInputProps.isTitleField({
            type: "checkbox",
          })}
        />
        <Checkbox
          key={fieldOptionsKeys.allowManualEdit}
          label="Allow manual edit"
          {...fieldOptionsInputProps.allowManualEdit({ type: "checkbox" })}
        />
        <Checkbox
          key={fieldOptionsKeys.isArray}
          label="Allow multiple values"
          {...fieldOptionsInputProps.isArray({ type: "checkbox" })}
        />
      </Group>
      <Select
        key={fieldOptionsKeys.valueExtractorType}
        data={valueExtractorOptions}
        label="Where should the data for this field come from?"
        {...fieldOptionsInputProps.valueExtractorType()}
      />
      {match(valueExtractorType)
        .with("manual_entry", () => {
          // There are currently no configurable options for a `manual_entry`
          // extractor, so there is nothing to render.
          return null;
        })
        .with("dataset_column_value", () => {
          return (
            <DatasetColumnValueExtractorEditor
              entityConfigForm={entityConfigForm}
              fieldIdx={idx}
            />
          );
        })
        .with("aggregation", () => {
          return <DangerText>Aggregations are not implemented yet.</DangerText>;
        })
        .exhaustive(() => {
          return <DangerText>Unsupported value extractor type</DangerText>;
        })}
    </Stack>
  );
}
