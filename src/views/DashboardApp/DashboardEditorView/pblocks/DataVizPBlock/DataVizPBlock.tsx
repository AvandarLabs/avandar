import { Stack, Text } from "@mantine/core";
import { Paper } from "@/lib/ui/Paper";
import { NLQuery } from "../../fields/NLQueryField/NLQueryField";
import { TableViz } from "../../TableViz";

type Props = {
  nlQuery: NLQuery;
};

export { type Props as DataVizPBlockProps };

export function DataVizPBlock({ nlQuery }: Props): JSX.Element {
  const { prompt, rawSql } = nlQuery;
  return (
    <Paper withBorder p="md">
      <Stack gap={6}>
        {prompt.length === 0 ?
          <Text c="dimmed" fz="sm">
            Add a prompt and generate SQL to configure this visualization.
          </Text>
        : null}
        <TableViz rawSQL={rawSql} />
      </Stack>
    </Paper>
  );
}
