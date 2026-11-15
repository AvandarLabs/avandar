import { useLingui } from "@lingui/react/macro";
import { DatasetColumnMappingCreator } from "../../../../src/views/OntologyDesignerApp/ConceptCreatorView/DatasetColumnAttributesBlock/DatasetColumnMappingCreator";
import { ManualEntryAttributesBlock } from "../../../../src/views/OntologyDesignerApp/ConceptCreatorView/ManualEntryAttributesBlock";
import {
  createMappingFormFromFrame,
  MAPPING_CONCEPT_ID,
} from "./createMappingFormFromFrame";
import type { ComponentProps } from "react";

type Props = { frame: number };

/** Unchanged mapping leaves consuming the checked frame-owned form projection. */
export function MappingFields({ frame }: Props) {
  const { t } = useLingui();
  const projection = createMappingFormFromFrame({
    frame,
    defaultManualFieldName: t`New field`,
  });
  // The unchanged controls accept the complete form type. This seam supplies
  // only the checked read/binding methods they use, with inert write callbacks.
  // Validation, submission, full model metadata and field watchers are absent.
  const conceptForm = projection as ComponentProps<
    typeof DatasetColumnMappingCreator
  >["conceptForm"];
  return (
    <>
      <div data-video-target="mapping-dataset-controls">
        <DatasetColumnMappingCreator
          conceptForm={conceptForm}
          attributeIdx={0}
          attributeName="supply_kits_delivered"
        />
      </div>
      <div data-video-target="mapping-manual-controls">
        <ManualEntryAttributesBlock
          conceptForm={conceptForm}
          conceptId={MAPPING_CONCEPT_ID}
        />
      </div>
    </>
  );
}
