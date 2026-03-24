import { Stack, Text } from "@mantine/core";
import { WithPuckProps } from "@puckeditor/core";
import { Paper } from "@/lib/ui/Paper/Paper";
import { NLQuery } from "../../../pfields/NLQueryPField/NLQueryPField";
import { useAvaPageMetadata } from "../../../useAvaPageMetadata";
import { TableViz } from "./TableViz";

type Props = {
  nlQuery: NLQuery;
};

export { type Props as DataVizPBlockProps };

export function DataVizPBlock({
  nlQuery,
  puck,
}: WithPuckProps<Props>): JSX.Element {
  const { prompt, rawSql } = nlQuery;
  const { dashboardId, workspaceId } = useAvaPageMetadata(puck);

  return (
    <Paper withBorder p="md">
      <Stack gap={6}>
        {prompt.length === 0 ?
          <Text c="dimmed" fz="sm">
            Add a prompt and generate SQL to configure this visualization.
          </Text>
        : null}
        <TableViz
          rawSQL={rawSql}
          dashboardId={dashboardId}
          workspaceId={workspaceId}
        />
      </Stack>
    </Paper>
  );
}
