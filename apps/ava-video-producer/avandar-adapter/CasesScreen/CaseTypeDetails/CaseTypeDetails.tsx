import { Paper } from "@avandar/ui";
import { Container, Stack, Title } from "@mantine/core";
import { CaseTypeAttributesList } from "@/views/OntologyDesignerApp/ConceptMetaView/CaseTypeAttributesList";
import { CaseTypeHeader } from "./CaseTypeHeader";
import type { ComponentProps, ReactNode } from "react";

type Props = {
  caseType: { id: string; name: string; description: string };
  attributes: NonNullable<
    ComponentProps<typeof CaseTypeAttributesList>["attributes"]
  >;
  datasets: NonNullable<
    ComponentProps<typeof CaseTypeAttributesList>["datasets"]
  >;
};

/**
 * The layout is the product's ConceptMetaView. Only its data hooks and
 * mutating action callbacks are replaced by the approved fixture binding.
 */
export function CaseTypeDetails({
  caseType,
  attributes,
  datasets,
}: Readonly<Props>): ReactNode {
  return (
    <Container py="md">
      <Stack gap="lg" maw={720}>
        <CaseTypeHeader caseType={caseType} />
        <Paper p="md">
          <Stack gap="md">
            <Title order={4}>Attributes</Title>
            <CaseTypeAttributesList
              attributes={attributes}
              datasets={datasets}
            />
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
}
