import { matchLiteral } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { Checkbox, Fieldset, Select, Stack } from "@mantine/core";
import { match } from "ts-pattern";
import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";
import { ValuePickerRule } from "$/models/ontology/ValuePickerRule/ValuePickerRule";
import { ValueShapeControl } from "@/components/caseFields/ValueShapeControl/ValueShapeControl";
import { ConceptCreatorStore } from "@/views/OntologyDesignerApp/ConceptCreatorView/ConceptCreatorStore/index";
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
};

/**
 * Returns the localized value-picker rule options the column's type allows.
 * On a text column `max` and `min` compare alphabetically, ignoring case and
 * accents. They are named for that rather than "maximum" and "minimum", which
 * would suggest "10" beats "9".
 */
function useValuePickerOptions(
  columnDataType: AvaDataType.T,
): ReadonlyArray<{ value: ValuePickerRule.T; label: string }> {
  const { t } = useLingui();
  const isText = AvaDataType.isText(columnDataType);
  const maxLabel = isText
    ? t`Choose the value that comes last alphabetically`
    : t`Choose the maximum value`;
  const minLabel = isText
    ? t`Choose the value that comes first alphabetically`
    : t`Choose the minimum value`;
  return ValuePickerRule.getAllowedRuleTypes({ columnDataType }).map(
    (ruleType) => {
      return {
        value: ruleType,
        label: matchLiteral(ruleType, {
          most_frequent: t`Choose the most frequent value`,
          first: t`Choose the first value we see`,
          sum: t`Get a sum of the values`,
          avg: t`Get an average of the values`,
          count: t`Get a count of how many values there are`,
          max: maxLabel,
          min: minLabel,
        }),
      };
    },
  );
}

/**
 * The select for which value to keep when several rows share one case. The
 * dataset's ID column never reduces its rows, so its select is locked to the
 * default rule and a note says why.
 */
function ValueRuleField({
  conceptForm,
  attributeIdx,
  attributeName,
  columnDataType,
  isIdentifierColumn,
}: Readonly<Props>): JSX.Element {
  const { t } = useLingui();
  const [state] = ConceptCreatorStore.useContext();
  const valuePickerOptions = useValuePickerOptions(columnDataType);
  const [mappingKeys, mappingInputProps] = conceptForm.keysAndProps(
    `datasetColumnAttributes.${attributeIdx}.mappings.datasetColumn`,
    ["valuePickerRuleType"],
  );

  return (
    <Select
      key={mappingKeys.valuePickerRuleType}
      data={valuePickerOptions}
      label={t`If there are multiple ${attributeName} values for one ${state.singularConceptName}, then...`}
      description={
        isIdentifierColumn ? t`ID fields keep their value as is.` : undefined
      }
      placeholder={t`Select rule (e.g. most frequent)`}
      {...mappingInputProps.valuePickerRuleType()}
      {...(isIdentifierColumn
        ? { value: ValuePickerRule.DEFAULT_RULE_TYPE, disabled: true }
        : {})}
    />
  );
}

/** The field's value shape. An ID field keeps one value, whatever is stored. */
function _readValueShape({
  conceptForm,
  attributeIdx,
  isIdentifierColumn,
}: Readonly<Props>): ConceptAttribute.ValueShape {
  if (isIdentifierColumn) {
    return "single";
  }
  return ConceptAttribute.getValueShape({
    isArray:
      conceptForm.getValues().datasetColumnAttributes[attributeIdx]?.isArray ??
      false,
  });
}

/**
 * The switch between keeping one value and every value, followed by the rule
 * select when the field keeps one value. An ID field keeps one value, so its
 * switch is locked to it.
 */
function ValueShapeFields(props: Readonly<Props>): JSX.Element {
  const { conceptForm, attributeIdx, attributeName, isIdentifierColumn } =
    props;
  const [attributeKeys] = conceptForm.keysAndProps(
    `datasetColumnAttributes.${attributeIdx}`,
    ["isArray"],
  );
  const valueShape = _readValueShape(props);

  return (
    <>
      <ValueShapeControl
        key={attributeKeys.isArray}
        fieldName={attributeName}
        value={valueShape}
        disabled={isIdentifierColumn}
        onChange={(nextValueShape) => {
          conceptForm.setFieldValue(
            `datasetColumnAttributes.${attributeIdx}.isArray`,
            ConceptAttribute.valueShapeToIsArray(nextValueShape),
          );
        }}
      />
      {match(valueShape)
        .with("single", () => {
          return <ValueRuleField {...props} />;
        })
        .with("list", () => {
          return null;
        })
        .exhaustive()}
    </>
  );
}

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
