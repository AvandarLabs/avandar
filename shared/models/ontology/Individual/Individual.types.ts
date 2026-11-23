import type { ConceptId } from "$/models/ontology/Concept/Concept.types.ts";
import type { ConceptStatusId } from "$/models/ontology/ConceptStatus/ConceptStatus.types.ts";
import type { SupabaseCrudModelSpec } from "$/models/SupabaseCrudModelSpec.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { UUID } from "@avandar/utils";
import type { SetOptional } from "type-fest";

export type IndividualId = UUID<"Individual">;

type IndividualRead = {
  assignedTo: string | undefined;
  createdAt: string;
  conceptId: ConceptId;
  externalId: string;
  id: IndividualId;
  missingFromSourceAt: string | undefined;
  name: string;
  statusId: ConceptStatusId;
  updatedAt: string;
  workspaceId: Workspace.Id;
};

/**
 * CRUD type definitions for the Workspace model.
 */
export type IndividualModel = SupabaseCrudModelSpec<
  {
    tableName: "individuals";
    modelName: "Individual";
    modelPrimaryKeyType: IndividualId;
    modelTypes: {
      Read: IndividualRead;
      Insert: SetOptional<
        IndividualRead,
        | "assignedTo"
        | "createdAt"
        | "id"
        | "missingFromSourceAt"
        | "statusId"
        | "updatedAt"
      >;
      Update: Partial<IndividualRead>;
    };
  },
  {
    dbTablePrimaryKey: "id";
  }
>;
