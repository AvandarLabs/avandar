/*
 * Types shared by the status set editor and the views that drive it in
 * edit mode.
 */
import type { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";

/**
 * Where the records of each removed saved status move, keyed by the removed
 * status. A removed status with records needs an entry before the set can
 * be saved.
 */
export type StatusReplacements = Partial<
  Record<ConceptStatus.Id, ConceptStatus.Id>
>;

/** Every edit the status set editor can make to its value. */
export type StatusSetEditorActions = {
  addStatus: () => void;
  updateStatus: (status: ConceptStatus.Draft) => void;
  removeStatus: (statusId: ConceptStatus.Id) => void;
  makeDefault: (statusId: ConceptStatus.Id) => void;
  moveStatus: (options: {
    statusId: ConceptStatus.Id;
    offset: -1 | 1;
  }) => void;
  reorderStatuses: (statuses: ConceptStatus.Draft[]) => void;
};
