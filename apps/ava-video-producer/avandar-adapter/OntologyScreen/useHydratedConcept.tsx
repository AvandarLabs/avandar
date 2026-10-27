import { createContext, useContext } from "react";
import type {
  OntologyConceptProjection,
  OntologyHydrationProjection,
} from "./OntologyScreen.types";

/** Hydrated ontology metadata supplied by the frame-owned adapter. */
export const FixtureConceptContext = createContext<
  OntologyHydrationProjection | undefined
>(undefined);

/** Replaces only ConceptMetaView's service hydration with fixture metadata. */
export function useHydratedConcept({
  concept,
}: {
  concept: OntologyConceptProjection;
}) {
  const fullConcept = useContext(FixtureConceptContext);
  if (!fullConcept || fullConcept.id !== concept.id) {
    throw new Error(
      "Ontology fixture metadata must match the inspected concept",
    );
  }
  return [fullConcept, false] as const;
}
