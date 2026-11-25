import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { Concept } from "$/models/ontology/Concept/Concept";

/**
 * One field of a data slot source that a slot attribute can be bound to: a
 * case type attribute or a dataset column. The binding UI lists these, a
 * binding's `attributeMap` stores their `id`, and the slot query selects
 * their `columnName`.
 */
export type DataSlotSourceField = Readonly<{
  /** The case type attribute id or dataset column id. */
  id: string;

  /** The field's column name in the source's DuckDB relation. */
  columnName: string;

  /** The name the binding UI shows for the field. */
  label: string;

  /** The field's type, which decides the slot attributes it can fill. */
  dataType: AvaDataType.T;
}>;

/**
 * A case type or dataset a data slot can read, with the fields a slot
 * attribute can be bound to. Built from the stored records by
 * `loadDataSlotSource`, then read to check a binding and to build the slot
 * query.
 *
 * - `concept`: a case type, queried through its `concept_<id>` view. List
 *   fields are left out, since a slot attribute holds one value per row.
 * - `dataset`: a dataset, queried through its own relation.
 */
export type DataSlotSource =
  | Readonly<{
      kind: "concept";
      conceptId: Concept.Id;
      name: string;
      fields: readonly DataSlotSourceField[];
    }>
  | Readonly<{
      kind: "dataset";
      datasetId: Dataset.Id;
      name: string;
      fields: readonly DataSlotSourceField[];
    }>;
