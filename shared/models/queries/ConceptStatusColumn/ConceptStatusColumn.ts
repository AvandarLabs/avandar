/* oxlint-disable typescript/no-namespace, import/export */
import type {
  ConceptStatusColumnId,
  ConceptStatusColumnRead,
} from "$/models/queries/ConceptStatusColumn/ConceptStatusColumn.types.ts";

export { ConceptStatusColumnModule as ConceptStatusColumn } from "$/models/queries/ConceptStatusColumn/ConceptStatusColumnModule.ts";

export namespace ConceptStatusColumn {
  export type T = ConceptStatusColumnRead;
  export type Id = ConceptStatusColumnId;
}
