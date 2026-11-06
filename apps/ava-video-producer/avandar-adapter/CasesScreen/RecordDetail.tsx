import { Container, Group, Stack, Title } from "@mantine/core";
import { RichTextComposer } from "@/components/RichText/RichTextComposer/RichTextComposer";
import { CaseDetailsRail } from "@/views/IndividualManagerApp/SingleIndividualView/CaseDetailsRail";
import { enter } from "../../src/motion";
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";
import type { CaseDetailsRow } from "@/views/IndividualManagerApp/SingleIndividualView/CaseDetailsRail";

type Props = {
  frame: number;
  caseLabel: string;
  fields: ReadonlyArray<Omit<CaseDetailsRow, "id">>;
};

/** Resolves immediately: the video never posts an update. */
function _ignoreSubmit(): Promise<boolean> {
  return Promise.resolve(false);
}

/**
 * The record page's pieces as the video shows them: the case's fields from
 * the real details rail and the real update composer. Nothing is posted or
 * saved; the composer only appears.
 */
export function RecordDetail({ frame, caseLabel, fields }: Props) {
  const attributes: CaseDetailsRow[] = fields.map((field) => {
    return { ...field, id: field.name as ConceptAttribute.Id };
  });
  return (
    <Container py="md">
      <Stack gap="lg" style={enter(frame, 358, { y: 10 })}>
        <Title order={2} fw={650}>
          {caseLabel}
        </Title>
        <Group align="flex-start" wrap="nowrap" gap="lg">
          <Stack flex={1} miw={0}>
            <RichTextComposer
              label="Write an update"
              placeholder="Write an update. Type @ to mention a teammate."
              mentionCandidates={[]}
              submitLabel="Post"
              isSubmitting={false}
              onSubmit={_ignoreSubmit}
            />
          </Stack>
          <CaseDetailsRail attributes={attributes} />
        </Group>
      </Stack>
    </Container>
  );
}
