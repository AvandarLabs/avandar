import { useLingui } from "@lingui/react/macro";
import { match } from "ts-pattern";
import { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";
import { ValueShapeControl } from "@/components/caseFields/ValueShapeControl";
import { ValueRuleField } from "@/views/OntologyDesignerApp/ConceptCreatorView/DatasetColumnAttributesBlock/DatasetColumnMappingCreator/ValueRuleField";
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
   * keeps one value, so its switch is locked to it.
   */
  isIdentifierColumn: boolean;
  /**
   * Whether the field is the case type's title. The title names a record, so
   * it keeps one value and its switch is locked to it.
   */
  isLabelColumn: boolean;
};

/**
 * The field's value shape. An ID field and the title field keep one value,
 * whatever is stored.
 */
function _readValueShape({
  conceptForm,
  attributeIdx,
  isIdentifierColumn,
  isLabelColumn,
}: Readonly<Props>): ConceptAttribute.ValueShape {
  if (isIdentifierColumn || isLabelColumn) {
    return "single";
  }
  return ConceptAttribute.getValueShape({
    isArray:
      conceptForm.getValues().datasetColumnAttributes[attributeIdx]?.isArray ??
      false,
  });
}

/** Says why the switch is locked, or nothing when it is open. */
function useLockDescription(
  options: Readonly<Pick<Props, "isIdentifierColumn" | "isLabelColumn">>,
): string | undefined {
  const { t } = useLingui();
  if (options.isIdentifierColumn) {
    return t`ID fields keep their value as is.`;
  }
  return options.isLabelColumn
    ? t`The title field keeps one value.`
    : undefined;
}

/**
 * The switch between keeping one value and every value, followed by the rule
 * select when the field keeps one value.
 */
export function ValueShapeFields(props: Readonly<Props>): JSX.Element {
  const { conceptForm, attributeIdx, attributeName } = props;
  const [attributeKeys] = conceptForm.keysAndProps(
    `datasetColumnAttributes.${attributeIdx}`,
    ["isArray"],
  );
  const valueShape = _readValueShape(props);
  const lockDescription = useLockDescription(props);

  return (
    <>
      <ValueShapeControl
        key={attributeKeys.isArray}
        fieldName={attributeName}
        value={valueShape}
        disabled={props.isIdentifierColumn || props.isLabelColumn}
        description={lockDescription}
        onChange={(nextValueShape) => {
          conceptForm.setFieldValue(
            `datasetColumnAttributes.${attributeIdx}.isArray`,
            ConceptAttribute.valueShapeToIsArray(nextValueShape),
          );
        }}
      />
      {match(valueShape)
        .with("single", () => {
          return (
            <ValueRuleField
              conceptForm={conceptForm}
              attributeIdx={attributeIdx}
              attributeName={attributeName}
              columnDataType={props.columnDataType}
              isIdentifierColumn={props.isIdentifierColumn}
            />
          );
        })
        .with("list", () => {
          return null;
        })
        .exhaustive()}
    </>
  );
}
