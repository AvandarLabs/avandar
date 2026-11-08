import { PeriodControls } from "@/components/caseFields/PeriodControls/PeriodControls";
import {
  readFormBucketError,
  readFormDateColumnOptions,
  writeFormShapeFields,
} from "@/views/OntologyDesignerApp/ConceptCreatorView/DatasetColumnAttributesBlock/DatasetColumnMappingCreator/formShapeFields";
import { ValueRuleField } from "@/views/OntologyDesignerApp/ConceptCreatorView/DatasetColumnAttributesBlock/DatasetColumnMappingCreator/ValueRuleField";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type { ConceptFormValues } from "@/views/OntologyDesignerApp/ConceptCreatorView/conceptFormTypes";
import type { FormShapeFields } from "@/views/OntologyDesignerApp/ConceptCreatorView/DatasetColumnAttributesBlock/DatasetColumnMappingCreator/formShapeFields";
import type { FormType } from "@avandar/ui/hooks";
import type { ReactNode } from "react";

type Props = {
  conceptForm: FormType<ConceptFormValues>;
  attributeIdx: number;
  attributeName: string;
  /** The type of the dataset column this field reads. */
  columnDataType: AvaDataType.T;
  /** Whether the field's column is the ID column of its dataset. */
  isIdentifierColumn: boolean;
  /** The field's stored shape, which holds its period and date column. */
  shape: FormShapeFields;
};

/**
 * A per-period form field's period, date column, and which value to keep in
 * each period. Rendered by `ValueShapeFields` once the field keeps one value
 * per period.
 */
export function PerPeriodFields({
  conceptForm,
  attributeIdx,
  attributeName,
  columnDataType,
  isIdentifierColumn,
  shape,
}: Readonly<Props>): ReactNode {
  return (
    <>
      <PeriodControls
        withLabels
        fieldName={attributeName}
        bucketGrain={shape.bucketGrain ?? "month"}
        bucketColumnId={shape.bucketColumnId}
        // The form stores the date column's error at the period's path.
        dateColumnError={readFormBucketError({ conceptForm, attributeIdx })}
        dateColumnOptions={readFormDateColumnOptions({
          conceptForm,
          attributeIdx,
        })}
        onChange={(choice) => {
          writeFormShapeFields({
            conceptForm,
            attributeIdx,
            nextShape: { isArray: true, ...choice },
          });
        }}
      />
      <ValueRuleField
        conceptForm={conceptForm}
        attributeIdx={attributeIdx}
        attributeName={attributeName}
        columnDataType={columnDataType}
        isIdentifierColumn={isIdentifierColumn}
        isPerPeriod
      />
    </>
  );
}
