import { useMutation, UseMutationResultTuple } from "@avandar/query-hooks";
import { ConceptClient } from "@/clients/ontology/ConceptClient";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import {
  insertConceptFromFormValues,
  rollbackConceptFormInsert,
} from "@/views/OntologyDesignerApp/insertConceptFromFormValues/insertConceptFromFormValues";
import type { ConceptFormSubmitValues } from "@/views/OntologyDesignerApp/ConceptCreatorView/conceptFormTypes";

export function useSubmitConceptCreatorForm(): UseMutationResultTuple<
  void,
  ConceptFormSubmitValues
> {
  const workspaceId = useCurrentWorkspace().id;

  return useMutation({
    mutationFn: async (conceptFormValues: ConceptFormSubmitValues) => {
      await insertConceptFromFormValues({
        ...conceptFormValues,
        workspaceId,
      });
    },

    onError: async (_error, conceptFormValues) => {
      await rollbackConceptFormInsert(conceptFormValues);
    },

    queryToInvalidate: ConceptClient.QueryKeys.getAll(),
  });
}
