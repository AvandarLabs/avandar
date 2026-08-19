import { createAppStateManager } from "@/lib/utils/state/createAppStateManager/createAppStateManager";

type ConceptCreatorState = {
  conceptName: string;
  singularConceptName: string;
  pluralConceptName: string;
};

const initialState: ConceptCreatorState = {
  conceptName: "",
  singularConceptName: "record",
  pluralConceptName: "records",
};

export const ConceptCreatorStore = createAppStateManager({
  name: "ConceptCreator",
  initialState,
  actions: {
    setConceptName: (state: ConceptCreatorState, conceptName: string) => {
      return {
        ...state,
        conceptName,
        singularConceptName: conceptName.toLowerCase() || "record",
        pluralConceptName: `${conceptName.toLowerCase() || "record"}s`,
      };
    },
  },
});
