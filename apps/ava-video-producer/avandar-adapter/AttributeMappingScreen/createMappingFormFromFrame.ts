import { uuid } from "../../../../shared/lib/uuid";
import { createMappingStageFromFrame } from "./createMappingStageFromFrame/createMappingStageFromFrame";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";
import type {
  MappingFormProjection,
  MappingInputValues,
  MappingInputPrefix,
  MappingValuesProjection,
} from "./AttributeMappingScreen.types";

/** Stable fixture concept identity. No backend object uses this ID. */
export const MAPPING_CONCEPT_ID = uuid<Concept.Id>(
  "00000000-0000-4000-8000-000000000801",
);
const MANUAL_ATTRIBUTE_ID = uuid<ConceptAttribute.Id>(
  "00000000-0000-4000-8000-000000000802",
);
const ignoreEdit = () => undefined;

function _createFieldBindings(options: {
  stage: ReturnType<typeof createMappingStageFromFrame>;
  prefix: MappingInputPrefix;
  fields: ReadonlyArray<keyof MappingInputValues>;
  manualFieldName: string;
}) {
  const { stage, prefix, fields, manualFieldName } = options;
  const values: Partial<MappingInputValues> = prefix.endsWith("datasetColumn")
    ? { valuePickerRuleType: stage.valuePickerRuleType }
    : prefix.startsWith("manualEntryAttributes")
      ? { ...stage.manualField, name: manualFieldName }
      : stage;
  return {
    keys: Object.fromEntries(
      fields.map((field) => [field, `${prefix}.${field}`]),
    ),
    inputProps: Object.fromEntries(
      fields.map((field) => [
        field,
        () => ({
          ...(typeof values[field] === "boolean"
            ? { checked: values[field] }
            : { value: values[field] ?? "" }),
          onChange: ignoreEdit,
          ...(field === "valuePickerRuleType"
            ? {
                dropdownOpened: stage.isRuleMenuOpen,
                comboboxProps: {
                  withinPortal: false,
                  transitionProps: { duration: 0 },
                },
              }
            : {}),
        }),
      ]),
    ),
  };
}

function _createMappingValuesFromStage(options: {
  stage: ReturnType<typeof createMappingStageFromFrame>;
  manualFieldName: string;
}): MappingValuesProjection {
  const { stage, manualFieldName } = options;
  const manualField = stage.manualField;
  return {
    datasetColumnAttributes: [
      {
        isArray: stage.isArray,
        allowManualEdit: stage.allowManualEdit,
        mappings: {
          datasetColumn: { valuePickerRuleType: stage.valuePickerRuleType },
        },
      },
    ],
    manualEntryAttributes: manualField
      ? [
          {
            id: MANUAL_ATTRIBUTE_ID,
            name: manualFieldName,
            allowManualEdit: manualField.allowManualEdit,
            isArray: manualField.isArray,
          },
        ]
      : [],
  };
}

/** Checked controlled form projection for a requested source frame. */
export function createMappingFormFromFrame(options: {
  frame: number;
  defaultManualFieldName: string;
}): MappingFormProjection {
  const { frame, defaultManualFieldName } = options;
  const stage = createMappingStageFromFrame(frame);
  const manualField = stage.manualField;
  const manualFieldName =
    manualField?.name.kind === "typed"
      ? manualField.name.value
      : defaultManualFieldName;
  const values = _createMappingValuesFromStage({ stage, manualFieldName });
  return {
    getValues: () => values,
    errors: {},
    keysAndProps: (prefix, fields) => {
      const { keys, inputProps } = _createFieldBindings({
        stage,
        prefix,
        fields,
        manualFieldName,
      });
      return [keys, inputProps];
    },
    setFieldValue: ignoreEdit,
    replaceListItem: ignoreEdit,
    removeListItem: ignoreEdit,
    insertListItem: ignoreEdit,
    clearFieldError: ignoreEdit,
  };
}
