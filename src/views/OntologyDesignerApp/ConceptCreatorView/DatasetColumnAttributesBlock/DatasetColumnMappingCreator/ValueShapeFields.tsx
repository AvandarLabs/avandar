import { useLingui } from "@lingui/react/macro";
import { match } from "ts-pattern";
import { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";
import { ValueShapeControl } from "@/components/caseFields/ValueShapeControl";
import {
  readFormDateColumnOptions,
  readFormShapeFields,
  writeFormShapeFields,
} from "@/views/OntologyDesignerApp/ConceptCreatorView/DatasetColumnAttributesBlock/DatasetColumnMappingCreator/formShapeFields";
import { PerPeriodFields } from "@/views/OntologyDesignerApp/ConceptCreatorView/DatasetColumnAttributesBlock/DatasetColumnMappingCreator/PerPeriodFields";
import { ValueRuleField } from "@/views/OntologyDesignerApp/ConceptCreatorView/DatasetColumnAttributesBlock/DatasetColumnMappingCreator/ValueRuleField";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type { DateColumnOption } from "@/components/caseFields/makeDateColumnOptions/makeDateColumnOptions";
import type { ConceptFormValues } from "@/views/OntologyDesignerApp/ConceptCreatorView/conceptFormTypes";
import type { FormShapeFields } from "@/views/OntologyDesignerApp/ConceptCreatorView/DatasetColumnAttributesBlock/DatasetColumnMappingCreator/formShapeFields";
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
function _readValueShape(
  options: Readonly<{
    isIdentifierColumn: boolean;
    isLabelColumn: boolean;
    shape: FormShapeFields;
  }>,
): ConceptAttribute.ValueShape {
  if (options.isIdentifierColumn || options.isLabelColumn) {
    return "single";
  }
  return ConceptAttribute.getValueShape(options.shape);
}

/**
 * The shape a field takes when the switch picks `nextValueShape`. A period
 * keeps the field's earlier choices, or starts per month on the dataset's
 * first date column. Any other shape drops the period.
 */
function _getShapeFieldsForValueShape(
  options: Readonly<{
    nextValueShape: ConceptAttribute.ValueShape;
    shape: FormShapeFields;
    dateColumnOptions: readonly DateColumnOption[];
  }>,
): FormShapeFields {
  const { nextValueShape, shape, dateColumnOptions } = options;
  return nextValueShape === "bucketed_list"
    ? {
        isArray: true,
        bucketGrain: shape.bucketGrain ?? "month",
        bucketColumnId: shape.bucketColumnId ?? dateColumnOptions[0]?.value,
      }
    : {
        isArray: ConceptAttribute.valueShapeToIsArray(nextValueShape),
        bucketGrain: undefined,
        bucketColumnId: undefined,
      };
}

/** Writes the shape the switch picked to the field's form values. */
function _writeValueShape(
  options: Readonly<{
    conceptForm: FormType<ConceptFormValues>;
    attributeIdx: number;
    nextValueShape: ConceptAttribute.ValueShape;
    shape: FormShapeFields;
  }>,
): void {
  writeFormShapeFields({
    conceptForm: options.conceptForm,
    attributeIdx: options.attributeIdx,
    nextShape: _getShapeFieldsForValueShape({
      ...options,
      dateColumnOptions: readFormDateColumnOptions(options),
    }),
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
 * The switch between keeping one value, every value, and one value per
 * period, followed by the period and date column pickers for a period, and
 * the rule select for one value or a period.
 */
export function ValueShapeFields(props: Readonly<Props>): JSX.Element {
  const { conceptForm, attributeIdx, attributeName } = props;
  const [attributeKeys] = conceptForm.keysAndProps(
    `datasetColumnAttributes.${attributeIdx}`,
    ["isArray"],
  );
  const shape = readFormShapeFields({ conceptForm, attributeIdx });
  const valueShape = _readValueShape({ ...props, shape });
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
          _writeValueShape({ ...props, nextValueShape, shape });
        }}
      />
      {match(valueShape)
        .with("single", () => {
          return <ValueRuleField {...props} isPerPeriod={false} />;
        })
        .with("list", () => {
          return null;
        })
        .with("bucketed_list", () => {
          return <PerPeriodFields {...props} shape={shape} />;
        })
        .exhaustive()}
    </>
  );
}
