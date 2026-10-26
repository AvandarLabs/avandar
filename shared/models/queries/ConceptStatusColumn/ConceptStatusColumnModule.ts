import { Model } from "@avandar/models";
import { uuid } from "$/lib/uuid.ts";
import type { ConceptId } from "$/models/ontology/Concept/Concept.types.ts";
import type {
  ConceptStatusColumnId,
  ConceptStatusColumnRead,
} from "$/models/queries/ConceptStatusColumn/ConceptStatusColumn.types.ts";

const COLUMN_NAME = "status";

function _fromConceptId(conceptId: ConceptId): ConceptStatusColumnRead {
  return Model.make("ConceptStatusColumn", {
    id: uuid<ConceptStatusColumnId>(conceptId),
    conceptId,
    name: COLUMN_NAME,
    dataType: "varchar",
  });
}

/** Builders and names for a case type's built-in `status` column. */
export const ConceptStatusColumnModule = {
  /** The column's name in the case type's relation and in every query. */
  COLUMN_NAME,

  /**
   * The status column of one case type. Its id is the case type's id, so two
   * loads of the same case type produce the same typed id, and a selected
   * status column is matched back up by `Model.getTypedId` after a reload.
   */
  fromConceptId: _fromConceptId,
};
