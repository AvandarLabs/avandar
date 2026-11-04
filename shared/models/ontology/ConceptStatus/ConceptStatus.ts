/* eslint-disable @typescript-eslint/no-namespace,import-x/export */
import type {
  ConceptStatusColorKey,
  ConceptStatusDraft,
  ConceptStatusId,
  ConceptStatusModel,
  ConceptStatusSaveErrorHint,
  ConceptStatusSavePayload,
  ConceptStatusSetIssue,
  ConceptStatusSetValue,
} from "$/models/ontology/ConceptStatus/ConceptStatus.types.ts";

export { ConceptStatusParsers } from "$/models/ontology/ConceptStatus/ConceptStatusParsers.ts";
export { ConceptStatusModule as ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatusModule/ConceptStatusModule.ts";

export namespace ConceptStatus {
  export type T<K extends keyof ConceptStatusModel = "Read"> =
    ConceptStatusModel[K];
  export type Id = ConceptStatusId;
  export type ColorKey = ConceptStatusColorKey;
  export type Draft = ConceptStatusDraft;
  export type SetValue = ConceptStatusSetValue;
  export type SetIssue = ConceptStatusSetIssue;
  export type SavePayload = ConceptStatusSavePayload;
  export type SaveErrorHint = ConceptStatusSaveErrorHint;
}
