import type { ConceptFormValues } from "@/views/OntologyDesignerApp/ConceptCreatorView/conceptFormTypes";
import type { FormType } from "@avandar/ui/hooks";

type ProductForm = FormType<ConceptFormValues>;
type Attribute = ConceptFormValues["datasetColumnAttributes"][number];
type Rule = Pick<Attribute["mappings"]["datasetColumn"], "valuePickerRuleType">;

/** Dataset and manual form fields read by the genuine product controls. */
export type MappingValuesProjection = {
  datasetColumnAttributes: ReadonlyArray<
    Pick<Attribute, "isArray" | "allowManualEdit"> & {
      mappings: { datasetColumn: Rule };
    }
  >;
  manualEntryAttributes: ReadonlyArray<
    Pick<Attribute, "id" | "name" | "allowManualEdit" | "isArray">
  >;
};

/** Source-typed values exposed through the frame-owned input bindings. */
export type MappingInputValues = Pick<
  Attribute,
  "isArray" | "allowManualEdit" | "name"
> &
  Rule;

/** Prefixes consumed by the two mounted form leaves. */
export type MappingInputPrefix =
  | "datasetColumnAttributes.0"
  | "datasetColumnAttributes.0.mappings.datasetColumn"
  | "manualEntryAttributes.0";

/** Original input-prop return contract used by the narrow form surface. */
export type MappingInputProps = ReturnType<ProductForm["getInputProps"]>;

/** Checked form projection excluding unrelated live form responsibilities. */
export type MappingFormProjection = Pick<
  ProductForm,
  | "errors"
  | "setFieldValue"
  | "replaceListItem"
  | "removeListItem"
  | "insertListItem"
  | "clearFieldError"
> & {
  getValues: () => MappingValuesProjection;
  keysAndProps: (
    prefix: MappingInputPrefix,
    fields: ReadonlyArray<keyof MappingInputValues>,
  ) => [Record<string, string>, Record<string, () => MappingInputProps>];
};
