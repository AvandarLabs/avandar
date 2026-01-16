import { Button, Group, Text } from "@mantine/core";
import { usePuck } from "@puckeditor/core";
import { uuid } from "@/lib/utils/uuid";

type Props = {
  readonly id: string;
  readonly onChange: (value: string) => void;
  readonly readOnly?: boolean;
};

function _getSelectedPrompt(selectedItem: unknown): string {
  const prompt: unknown = (selectedItem as { props?: { prompt?: unknown } })
    ?.props?.prompt;

  return typeof prompt === "string" ? prompt.trim() : "";
}

export function GenerateSQLButtonField({
  id,
  onChange,
  readOnly,
}: Props): JSX.Element {
  const { selectedItem, resolveDataById } = usePuck();

  const prompt: string = _getSelectedPrompt(selectedItem);
  const isDisabled: boolean = readOnly === true || prompt.length === 0;

  const onGenerate = (): void => {
    const requestId: string = uuid();

    onChange(requestId);
    resolveDataById(id, "force");
  };

  return (
    <Group gap="sm">
      <Button
        size="xs"
        variant="light"
        disabled={isDisabled}
        onClick={onGenerate}
      >
        Run Query
      </Button>
      {prompt.length === 0 ?
        <Text c="dimmed" fz="sm">
          Add a prompt to run a query.
        </Text>
      : null}
    </Group>
  );
}
