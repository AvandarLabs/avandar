import { Stack, Text } from "@mantine/core";
import { Paper } from "@/lib/ui/Paper";
import { TableViz } from "./TableViz";

export type DataVizProps = {
  prompt: string;
  generateSqlRequestId: string;
  sql: string;
  sqlError: string;
  sqlGeneratedFromPrompt: string;
};

function _isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function DataViz(props: Partial<DataVizProps>): JSX.Element {
  const prompt: string = _isNonEmptyString(props.prompt) ? props.prompt : "";
  const sql: string = _isNonEmptyString(props.sql) ? props.sql : "";
  const sqlGeneratedFromPrompt: string =
    _isNonEmptyString(props.sqlGeneratedFromPrompt) ?
      props.sqlGeneratedFromPrompt
    : "";
  const sqlError: string =
    _isNonEmptyString(props.sqlError) ? props.sqlError : "";

  const isSQLStale: boolean =
    prompt.length > 0 &&
    sqlGeneratedFromPrompt.length > 0 &&
    prompt.trim() !== sqlGeneratedFromPrompt.trim();

  return (
    <Paper withBorder p="md">
      <Stack gap={6}>
        {prompt.length === 0 ?
          <Text c="dimmed" fz="sm">
            Add a prompt and generate SQL to configure this visualization.
          </Text>
        : null}
        {sqlError.length > 0 ?
          <Text c="red" fz="sm">
            {sqlError}
          </Text>
        : null}
        {isSQLStale ?
          <Text c="orange" fz="sm">
            SQL is out of date. Re-generate SQL to match the current prompt.
          </Text>
        : null}
        <TableViz rawSQL={sql} isStale={isSQLStale} />
      </Stack>
    </Paper>
  );
}
