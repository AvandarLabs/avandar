import { useLingui } from "@lingui/react/macro";
import { Checkbox, Fieldset, Stack } from "@mantine/core";
import { ValueShapeFields } from "@/views/OntologyDesignerApp/ConceptCreatorView/DatasetColumnAttributesBlock/DatasetColumnMappingCreator/ValueShapeFields";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type { ConceptFormValues } from "@/views/OntologyDesignerApp/ConceptCreatorView/conceptFormTypes";
import type { FormType } from "@avandar/ui/hooks";

type Props = {
  conceptForm: FormType<ConceptFormValues>;
  attributeIdx: number;
  attributeName: string;
  /** The type of the dataset column this field reads. */
  columnDataType: AvaDataType.T;
  /**
   * Whether the field's column is the ID column of its dataset. An ID field
   * never reduces its rows, so its rule is locked to the default.
   */
  isIdentifierColumn: boolean;
  /**
   * Whether the field is the case type's title. The title names a record, so
   * it keeps one value.
   */
  isLabelColumn: boolean;
};

/**
 * The settings for one field that reads a dataset column: whether a person
 * may edit it, whether it keeps one value or every value, and for one value,
 * which to keep.
 */
export function DatasetColumnMappingCreator(props: Props): JSX.Element {
  const { t } = useLingui();
  const { conceptForm, attributeIdx, attributeName } = props;
  const [attributeKeys, attributeInputProps] = conceptForm.keysAndProps(
    `datasetColumnAttributes.${attributeIdx}`,
    ["allowManualEdit"],
  );

  return (
    <Fieldset legend={attributeName}>
      <Stack>
        <Checkbox
          key={attributeKeys.allowManualEdit}
          label={t`Allow manual edit`}
          {...attributeInputProps.allowManualEdit({ type: "checkbox" })}
        />
        <ValueShapeFields {...props} />
      </Stack>
    </Fieldset>
  );
}
