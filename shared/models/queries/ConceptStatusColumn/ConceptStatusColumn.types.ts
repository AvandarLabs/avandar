import type { ConceptId } from "$/models/ontology/Concept/Concept.types.ts";
import type { Model } from "@avandar/models";
import type { UUID } from "@avandar/utils";

type ModelType = "ConceptStatusColumn";

/** The status column's id, which is its case type's id rebranded. */
export type ConceptStatusColumnId = UUID<ModelType>;

/**
 * The built-in `status` column every case type offers to queries. It has no
 * database row: it stands for the status name each record carries in the
 * case type's DuckDB relation.
 */
export type ConceptStatusColumnRead = Model.Base<
  ModelType,
  {
    /** Derived from `conceptId`, so it is the same on every load. */
    id: ConceptStatusColumnId;
    conceptId: ConceptId;
    name: "status";
    dataType: "varchar";
  }
>;
