import { Paper } from "@avandar/ui";
import { Container, Stack, Title } from "@mantine/core";
import type { ComponentProps } from "react";
import { ActivityBlock } from "@/views/IndividualManagerApp/SingleIndividualView/ActivityBlock";
import { RecordAttributesList } from "@/views/IndividualManagerApp/SingleIndividualView/RecordAttributesList";
import { enter } from "../../src/motion";

type Props = {
  frame: number;
  caseLabel: string;
  fields: ComponentProps<typeof RecordAttributesList>["attributes"];
};

/**
 * This is SingleIndividualView's layout, with its actual field and notes
 * components. No notes are entered or saved; that product path is unbuilt.
 */
export function RecordDetail({ frame, caseLabel, fields }: Props) {
  return (
    <Container py="md">
      <Stack gap="lg" maw={720} style={enter(frame, 358, { y: 10 })}>
        <Title order={2} fw={650}>
          {caseLabel}
        </Title>
        <Paper p="lg">
          <Stack gap="lg">
            <Title order={4}>Details</Title>
            <RecordAttributesList attributes={fields} />
          </Stack>
        </Paper>
        <Paper p="lg">
          <ActivityBlock />
        </Paper>
      </Stack>
    </Container>
  );
}
