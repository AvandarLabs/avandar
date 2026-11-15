import { Trans, useLingui } from "@lingui/react/macro";
import { Group, Loader, Stack, Table, Text } from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { useId } from "react";
import css from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/MappingPane/MappingPane.module.css";
import { useFillExample } from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/MappingPane/useFillExample/useFillExample";
import type {
  FillExampleOptions,
  FillExampleRow,
} from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/MappingPane/useFillExample/useFillExample";
import type { ReactNode } from "react";

/** How long the fill must stay unchanged before its example is read. */
const EXAMPLE_DEBOUNCE_MS = 300;

type Props = FillExampleOptions & { datasetName: string };

function ExampleTable(
  props: Readonly<{ rows: readonly FillExampleRow[]; labelId: string }>,
): ReactNode {
  return (
    <Table fz="xs" verticalSpacing={4} aria-labelledby={props.labelId}>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>
            <Trans>In this dataset</Trans>
          </Table.Th>
          <Table.Th>
            <Trans>In the combined dataset</Trans>
          </Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {props.rows.map((row) => {
          return (
            <Table.Tr key={row.before}>
              <Table.Td className={css.exampleValue}>{row.before}</Table.Td>
              <Table.Td className={css.exampleValue}>
                {row.after === undefined ? (
                  <Text span size="xs" c="dimmed" fs="italic">
                    <Trans>Becomes empty</Trans>
                  </Text>
                ) : (
                  row.after
                )}
              </Table.Td>
            </Table.Tr>
          );
        })}
      </Table.Tbody>
    </Table>
  );
}

/**
 * Up to three values from the layout's first dataset and what the combined
 * dataset holds for each, read with the SQL it will run. A value the fill
 * cannot convert says it becomes empty. Nothing shows for a fill with no
 * example.
 */
export function FillExample(props: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const labelId = useId();
  const [fill] = useDebouncedValue(props.fill, EXAMPLE_DEBOUNCE_MS);
  const example = useFillExample({ ...props, fill });
  if (!example) {
    return null;
  }
  const { datasetName } = props;
  return (
    <Stack gap={6}>
      <Text id={labelId} size="xs" fw={600} c="dimmed">
        <Trans>Example</Trans>
      </Text>
      {example.status === "reading" ? (
        <Group gap="xs" role="status" aria-label={t`Reading an example`}>
          <Loader size="xs" />
        </Group>
      ) : null}
      {example.status === "failed" ? (
        <Text size="xs" c="dimmed">
          <Trans>
            The example could not be read. The column is still filled this way.
          </Trans>
        </Text>
      ) : null}
      {example.status === "ready" && example.result.length === 0 ? (
        <Text size="xs" c="dimmed">
          <Trans>{datasetName} has no values to show here.</Trans>
        </Text>
      ) : null}
      {example.status === "ready" && example.result.length > 0 ? (
        <ExampleTable rows={example.result} labelId={labelId} />
      ) : null}
    </Stack>
  );
}
