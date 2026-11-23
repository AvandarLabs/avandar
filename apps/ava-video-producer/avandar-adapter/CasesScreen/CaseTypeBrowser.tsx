import { Flex, ScrollArea } from "@mantine/core";
import { ConceptNavbar } from "@/views/OntologyDesignerApp/ConceptNavbar";
import { caseType, attributes, datasets } from "./CasesScreen.constants";
import { CaseTypeDetails } from "./CaseTypeDetails/CaseTypeDetails";
import type { ComponentProps, ReactNode } from "react";
/** Place the selected case metadata beside the real concept navigation. */
export function CaseTypeBrowser(): ReactNode {
  return (
    <Flex align="stretch" h="100%">
      <ConceptNavbar
        miw={240}
        concepts={
          [caseType] as unknown as ComponentProps<
            typeof ConceptNavbar
          >["concepts"]
        }
        isLoading={false}
      />
      <ScrollArea h="100%" w="100%">
        <CaseTypeDetails
          caseType={caseType}
          attributes={attributes}
          datasets={datasets}
        />
      </ScrollArea>
    </Flex>
  );
}
