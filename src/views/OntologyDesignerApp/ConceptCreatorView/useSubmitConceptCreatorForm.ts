import { useMutation, UseMutationResultTuple } from "@avandar/query-hooks";
import { ConceptClient } from "@/clients/ontology/ConceptClient";
import { ConceptStatusClient } from "@/clients/ontology/ConceptStatusClient";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { insertConceptFromFormValues } from "@/views/OntologyDesignerApp/insertConceptFromFormValues/insertConceptFromFormValues";
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

    queriesToInvalidate: [
      ConceptClient.QueryKeys.getAll(),
      ConceptStatusClient.QueryKeys.getAll(),
    ],
  });
}
