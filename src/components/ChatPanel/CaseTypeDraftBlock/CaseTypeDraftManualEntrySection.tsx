import type { CaseTypeDraftEditor } from "./useCaseTypeDraftEditor";

import { Trans, useLingui } from "@lingui/react/macro";
import {
  ActionIcon,
  Checkbox,
  Group,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { useState } from "react";

type Props = {
  editor: CaseTypeDraftEditor;
};

/**
 * Fields users fill in by hand. Offered unchecked so adding them is opt-in,
 * with a row for naming one the model did not think of.
 */
export function CaseTypeDraftManualEntrySection({
  editor,
}: Readonly<Props>): React.ReactNode {
  const { t } = useLingui();
  const [newAttributeName, setNewAttributeName] = useState("");

  const addAttribute = (): void => {
    editor.addManualEntryAttribute(newAttributeName);
    setNewAttributeName("");
  };

  return (
    <Stack gap={4}>
      <Text size="xs" fw={600} c="dimmed" tt="uppercase">
        <Trans>Filled in by hand</Trans>
      </Text>
      {editor.draft.manualEntryAttributes.map((attribute) => {
        return (
          <Checkbox
            key={attribute.name}
            size="xs"
            label={attribute.name}
            checked={attribute.isIncluded}
            onChange={() => {
              editor.toggleManualEntryAttribute(attribute.name);
            }}
          />
        );
      })}
      <Group gap="xs" wrap="nowrap" mt={2}>
        <TextInput
          size="xs"
          flex={1}
          value={newAttributeName}
          placeholder={t`Add a field, e.g. Review notes`}
          aria-label={t`Add a field filled in by hand`}
          onChange={(event) => {
            setNewAttributeName(event.currentTarget.value);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addAttribute();
            }
          }}
        />
        <ActionIcon
          size="sm"
          variant="subtle"
          aria-label={t`Add field`}
          disabled={newAttributeName.trim().length === 0}
          onClick={addAttribute}
        >
          <IconPlus size={14} />
        </ActionIcon>
      </Group>
    </Stack>
  );
}
