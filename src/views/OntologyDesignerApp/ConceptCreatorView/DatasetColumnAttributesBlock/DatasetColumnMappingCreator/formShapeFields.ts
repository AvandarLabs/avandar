import { makeDateColumnOptions } from "@/components/caseFields/makeDateColumnOptions/makeDateColumnOptions";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";
import type { DateColumnOption } from "@/components/caseFields/makeDateColumnOptions/makeDateColumnOptions";
import type { ConceptFormValues } from "@/views/OntologyDesignerApp/ConceptCreatorView/conceptFormTypes";
import type { FormType } from "@avandar/ui/hooks";

/** A field's stored shape: the columns the value shape switch writes. */
export type FormShapeFields = {
  isArray: boolean;
  bucketGrain: ConceptAttribute.BucketGrain | undefined;
  bucketColumnId: string | undefined;
};

/**
 * Reads a dataset field's stored shape from the case type form. Read by
 * `ValueShapeFields` to decide which controls to show.
 */
export function readFormShapeFields(
  options: Readonly<{
    conceptForm: FormType<ConceptFormValues>;
    attributeIdx: number;
  }>,
): FormShapeFields {
  const attribute =
    options.conceptForm.getValues().datasetColumnAttributes[
      options.attributeIdx
    ];
  return {
    isArray: attribute?.isArray ?? false,
    bucketGrain: attribute?.bucketGrain,
    bucketColumnId: attribute?.mappings.datasetColumn.bucketColumnId,
  };
}

/**
 * Writes a dataset field's shape to the case type form, all three columns
 * together, so a field never keeps a period it no longer has. Called by
 * `ValueShapeFields` when the switch changes and by `PerPeriodFields` when
 * the period or date column changes.
 */
export function writeFormShapeFields(
  options: Readonly<{
    conceptForm: FormType<ConceptFormValues>;
    attributeIdx: number;
    nextShape: FormShapeFields;
  }>,
): void {
  const { conceptForm, nextShape } = options;
  const path = `datasetColumnAttributes.${options.attributeIdx}` as const;
  conceptForm.setFieldValue(`${path}.isArray`, nextShape.isArray);
  conceptForm.setFieldValue(`${path}.bucketGrain`, nextShape.bucketGrain);
  conceptForm.setFieldValue(
    `${path}.mappings.datasetColumn.bucketColumnId`,
    // Every option is one of this dataset's column ids.
    nextShape.bucketColumnId as DatasetColumn.Id | undefined,
  );
}

/**
 * The date and timestamp columns of a dataset field's dataset, as options
 * for its date column picker. Read by `ValueShapeFields` to start a period
 * on the first one, and by `PerPeriodFields` for the picker.
 */
export function readFormDateColumnOptions(
  options: Readonly<{
    conceptForm: FormType<ConceptFormValues>;
    attributeIdx: number;
  }>,
): DateColumnOption[] {
  const values = options.conceptForm.getValues();
  const datasetId =
    values.datasetColumnAttributes[options.attributeIdx]?.mappings.datasetColumn
      .datasetId;
  const sourceDataset = values.sourceDatasets.find((source) => {
    return source.dataset.id === datasetId;
  });
  return makeDateColumnOptions(sourceDataset?.dataset.columns ?? []);
}

/**
 * The error the form holds for a dataset field's period, which says the
 * field has no date column. Read by `PerPeriodFields` to show under the date
 * column picker. It clears when `writeFormShapeFields` next writes the field.
 */
export function readFormBucketError(
  options: Readonly<{
    conceptForm: FormType<ConceptFormValues>;
    attributeIdx: number;
  }>,
): string | undefined {
  const error =
    options.conceptForm.errors[
      `datasetColumnAttributes.${options.attributeIdx}.bucketGrain`
    ];
  return typeof error === "string" ? error : undefined;
}
