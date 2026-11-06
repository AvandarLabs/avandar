import { useLingui } from "@lingui/react/macro";
import { Flex, ScrollArea } from "@mantine/core";
import { useLayoutEffect, useRef } from "react";
import { uuid } from "../../../../shared/lib/uuid";
import { ConceptMetaView } from "../../../../src/views/OntologyDesignerApp/ConceptMetaView";
import { ConceptNavbar } from "../../../../src/views/OntologyDesignerApp/ConceptNavbar";
import { createOntologyStageFromFrame } from "./createOntologyStageFromFrame/createOntologyStageFromFrame";
import css from "./OntologyScreen.module.css";
import { FixtureConceptContext } from "./useHydratedConcept";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";
import type {
  OntologyConceptProjection,
  OntologyFixtureProjection,
  OntologyHydrationProjection,
  OntologyAttributeProjection,
} from "./OntologyScreen.types";

export {
  ONTOLOGY_BEATS,
  ONTOLOGY_DURATION,
} from "./createOntologyStageFromFrame/createOntologyStageFromFrame";

const CONCEPT_IDS = {
  response: uuid<Concept.Id>("00000000-0000-4000-8000-000000000601"),
  facility: uuid<Concept.Id>("00000000-0000-4000-8000-000000000602"),
};
const DATASET_IDS = {
  response: uuid<Dataset.Id>("00000000-0000-4000-8000-000000000611"),
  facility: uuid<Dataset.Id>("00000000-0000-4000-8000-000000000612"),
};
type Props = { frame: number; width: number; height: number };

/** Actual concept and attribute inspection, with fixture hydration only. */
export function OntologyScreen({ frame, width, height }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const stage = createOntologyStageFromFrame(frame);
  const fixture = useOntologyFixture(stage);
  // These unchanged leaves require complete models, but read only the checked
  // projections. Ownership, timestamps and model branding are not supplied.
  const presentation: Pick<OntologyFixtureProjection, "concepts" | "concept"> =
    fixture;
  const { concepts, concept } = presentation as {
    concepts: readonly Concept.T[];
    concept: Concept.T;
  };
  useOntologyTargets(root, stage.conceptKey);
  return (
    <Flex ref={root} className={css.ontologyScreen} w={width} h={height}>
      <div
        className={css.ontologyScreenNavigation}
        data-video-target="ontology-concepts"
      >
        <ConceptNavbar concepts={concepts} isLoading={false} h="100%" />
      </div>
      <ScrollArea h="100%" w="100%" data-video-target="ontology-attributes">
        <FixtureConceptContext.Provider value={fixture.fullConcept}>
          <ConceptMetaView concept={concept} />
        </FixtureConceptContext.Provider>
      </ScrollArea>
    </Flex>
  );
}

function useOntologyFixture(
  stage: ReturnType<typeof createOntologyStageFromFrame>,
): OntologyFixtureProjection {
  const { t } = useLingui();
  const concepts: readonly OntologyConceptProjection[] = [
    {
      id: CONCEPT_IDS.response,
      name: t`Response case`,
      description: t`Fictional Harborfield response records.`,
    },
    {
      id: CONCEPT_IDS.facility,
      name: t`Facility`,
      description: t`Fictional Harborfield facilities and available supplies.`,
    },
  ];
  const concept = concepts[stage.conceptKey === "response" ? 0 : 1]!;
  const sourceName =
    stage.conceptKey === "response" ? "cases.csv" : "facilities.csv";
  const datasetId = DATASET_IDS[stage.conceptKey];
  const fullConcept: OntologyHydrationProjection = {
    ...concept,
    datasets: [{ id: datasetId, name: sourceName }],
    attributes: stage.fields.map(
      (field, index): OntologyAttributeProjection => ({
        id: uuid<ConceptAttribute.Id>(
          `00000000-0000-4000-8000-${String(
            (stage.conceptKey === "response" ? 620 : 630) + index,
          ).padStart(12, "0")}`,
        ),
        name: field.name,
        isIdentifier: field.isIdentifier ?? false,
        isLabel: field.isLabel ?? false,
        mappingType: "dataset_column",
        mapping: { type: "dataset_column", datasetId },
      }),
    ),
  };
  return { concepts, concept, fullConcept };
}

function useOntologyTargets(
  root: React.RefObject<HTMLDivElement | null>,
  conceptKey: "response" | "facility",
) {
  useLayoutEffect(() => {
    const links = root.current?.querySelectorAll("a") ?? [];
    links.forEach((link, index) => {
      const key = index === 0 ? "response" : "facility";
      link.setAttribute("data-video-target", `ontology-${key}`);
      link.classList.toggle("active", key === conceptKey);
      link.setAttribute(
        "data-status",
        key === conceptKey ? "active" : "inactive",
      );
      if (key === conceptKey) {
        link.setAttribute("data-active", "true");
      } else {
        link.removeAttribute("data-active");
      }
    });
    const rows = root.current?.querySelectorAll('[role="listitem"]');
    rows?.[0]
      ?.querySelector(".mantine-Badge-root")
      ?.setAttribute("data-video-target", `ontology-${conceptKey}-identifier`);
    rows?.[1]
      ?.querySelector(".mantine-Badge-root")
      ?.setAttribute("data-video-target", `ontology-${conceptKey}-label`);
    const sourceLabels = rows?.[2]?.querySelectorAll("p");
    sourceLabels?.[sourceLabels.length - 1]?.setAttribute(
      "data-video-target",
      `ontology-${conceptKey}-source`,
    );
  }, [root, conceptKey]);
}
