import type { Workspace } from "$/models/Workspace/Workspace";
import type { ChatCreatedCaseType } from "$/types/chat.types";

import { where } from "@avandar/utils";

import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import { ConceptClient } from "@/clients/ontology/ConceptClient";
import { AvaQueryClient } from "@/config/AvaQueryClient";
import { createdCaseTypeToFormValues } from "@/views/OntologyDesignerApp/createdCaseTypeToFormValues/createdCaseTypeToFormValues";
import {
  insertConceptFromFormValues,
  rollbackConceptFormInsert,
} from "@/views/OntologyDesignerApp/insertConceptFromFormValues/insertConceptFromFormValues";

/**
 * Inserts each chat-created case type using the concept creator persist path.
 */
export async function applyCreatedCaseTypes(options: {
  caseTypes: readonly ChatCreatedCaseType[];
  workspaceId: Workspace.Id;
}): Promise<void> {
  const columns = await DatasetColumnClient.getAll(
    where("workspace_id", "eq", options.workspaceId),
  );
  for (const caseType of options.caseTypes) {
    const formValues = createdCaseTypeToFormValues({
      caseType,
      workspaceId: options.workspaceId,
      columns,
    });
    try {
      await insertConceptFromFormValues(formValues);
    } catch (error) {
      await rollbackConceptFormInsert(formValues);
      throw error;
    }
  }
  await AvaQueryClient.invalidateQueries({
    queryKey: ConceptClient.QueryKeys.getAll(),
  });
}
