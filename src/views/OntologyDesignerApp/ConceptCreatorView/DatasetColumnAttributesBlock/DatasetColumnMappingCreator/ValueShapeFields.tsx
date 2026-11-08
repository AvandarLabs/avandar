import { useLingui } from "@lingui/react/macro";
import { match } from "ts-pattern";
import { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";
import { makeDateColumnOptions } from "@/components/caseFields/makeDateColumnOptions/makeDateColumnOptions";
import { PeriodControls } from "@/components/caseFields/PeriodControls/PeriodControls";
import { ValueShapeControl } from "@/components/caseFields/ValueShapeControl";
import { ValueRuleField } from "@/views/OntologyDesignerApp/ConceptCreatorView/DatasetColumnAttributesBlock/DatasetColumnMappingCreator/ValueRuleField";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type { DatasetColumnId } from "$/models/datasets/DatasetColumn/DatasetColumn.types";
import type { DateColumnOption } from "@/components/caseFields/makeDateColumnOptions/makeDateColumnOptions";
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

/** A field's stored shape: the columns the value shape switch writes. */
type ShapeFields = {
  isArray: boolean;
  bucketGrain: ConceptAttribute.BucketGrain | undefined;
  bucketColumnId: string | undefined;
};

/** The field's stored shape, read from the form. */
function _readShapeFields({
  conceptForm,
  attributeIdx,
}: Readonly<Props>): ShapeFields {
  const attribute =
    conceptForm.getValues().datasetColumnAttributes[attributeIdx];
  return {
    isArray: attribute?.isArray ?? false,
    bucketGrain: attribute?.bucketGrain,
    bucketColumnId: attribute?.mappings.datasetColumn.bucketColumnId,
  };
}

/**
 * The field's value shape. An ID field and the title field keep one value,
 * whatever is stored.
 */
function _readValueShape(
  props: Readonly<Props>,
  shape: ShapeFields,
): ConceptAttribute.ValueShape {
  if (props.isIdentifierColumn || props.isLabelColumn) {
    return "single";
  }
  return ConceptAttribute.getValueShape(shape);
}

/** The date and timestamp columns of the field's dataset, as options. */
function _readDateColumnOptions({
  conceptForm,
  attributeIdx,
}: Readonly<Props>): DateColumnOption[] {
  const values = conceptForm.getValues();
  const datasetId =
    values.datasetColumnAttributes[attributeIdx]?.mappings.datasetColumn
      .datasetId;
  const sourceDataset = values.sourceDatasets.find((source) => {
    return source.dataset.id === datasetId;
  });
  return makeDateColumnOptions(sourceDataset?.dataset.columns ?? []);
}

/** Writes a field's shape to the form, all three columns together. */
function _writeShapeFields(
  { conceptForm, attributeIdx }: Readonly<Props>,
  nextShape: ShapeFields,
): void {
  const path = `datasetColumnAttributes.${attributeIdx}` as const;
  conceptForm.setFieldValue(`${path}.isArray`, nextShape.isArray);
  conceptForm.setFieldValue(`${path}.bucketGrain`, nextShape.bucketGrain);
  conceptForm.setFieldValue(
    `${path}.mappings.datasetColumn.bucketColumnId`,
    // Every option is one of this dataset's column ids.
    nextShape.bucketColumnId as DatasetColumnId | undefined,
  );
}

/**
 * The shape a field takes when the switch picks `nextValueShape`. A period
 * keeps the field's earlier choices, or starts per month on the dataset's
 * first date column. Any other shape drops the period.
 */
function _getShapeFieldsForValueShape(
  options: Readonly<{
    nextValueShape: ConceptAttribute.ValueShape;
    shape: ShapeFields;
    dateColumnOptions: readonly DateColumnOption[];
  }>,
): ShapeFields {
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
  const shape = _readShapeFields(props);
  const valueShape = _readValueShape(props, shape);
  const dateColumnOptions = _readDateColumnOptions(props);
  const lockDescription = useLockDescription(props);
  const renderRuleSelect = (isPerPeriod: boolean) => {
    return (
      <ValueRuleField
        conceptForm={conceptForm}
        attributeIdx={attributeIdx}
        attributeName={attributeName}
        columnDataType={props.columnDataType}
        isIdentifierColumn={props.isIdentifierColumn}
        isPerPeriod={isPerPeriod}
      />
    );
  };

  return (
    <>
      <ValueShapeControl
        key={attributeKeys.isArray}
        fieldName={attributeName}
        value={valueShape}
        disabled={props.isIdentifierColumn || props.isLabelColumn}
        description={lockDescription}
        onChange={(nextValueShape) => {
          _writeShapeFields(
            props,
            _getShapeFieldsForValueShape({
              nextValueShape,
              shape,
              dateColumnOptions,
            }),
          );
        }}
      />
      {match(valueShape)
        .with("single", () => {
          return renderRuleSelect(false);
        })
        .with("list", () => {
          return null;
        })
        .with("bucketed_list", () => {
          return (
            <>
              <PeriodControls
                withLabels
                fieldName={attributeName}
                bucketGrain={shape.bucketGrain ?? "month"}
                bucketColumnId={shape.bucketColumnId}
                dateColumnOptions={dateColumnOptions}
                onChange={(choice) => {
                  _writeShapeFields(props, { isArray: true, ...choice });
                }}
              />
              {renderRuleSelect(true)}
            </>
          );
        })
        .exhaustive()}
    </>
  );
}
