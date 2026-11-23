import { getIsMacPlatform } from "@avandar/browser-utils";
import { Button, Group, Text } from "@mantine/core";
import { useI18nMessages } from "@ui/i18n/useI18nMessages";
import type { EditableDisplayTextEditorProps } from "./EditableDisplayTextEditor.types";

type Props = Pick<
  EditableDisplayTextEditorProps,
  "onSaveClick" | "onCancelClick" | "isSaving" | "disabled" | "isSaveDisabled"
> & { isTextarea: boolean };

/** Save and cancel controls used by EditableDisplayTextEditor. */
export function EditableDisplayTextActions({
  onSaveClick,
  onCancelClick,
  isSaving,
  disabled,
  isSaveDisabled,
  isTextarea,
}: Readonly<Props>): JSX.Element {
  const i18n = useI18nMessages();
  const multilineShortcut = getIsMacPlatform() ? "⌘↵" : "Ctrl↵";
  const keyboardShortcut = isTextarea ? multilineShortcut : "Enter";
  const keyboardShortcutSymbol = isTextarea ? multilineShortcut : "↵";
  return (
    <Group mt="xxs" gap="xs">
      <Button
        size="compact-sm"
        variant="light"
        onClick={onSaveClick}
        loading={isSaving}
        disabled={disabled || isSaveDisabled}
      >
        <Group gap="xxs" align="bottom">
          {i18n.save}
          <Text span size="xs" c="primary.6">
            {keyboardShortcutSymbol}
          </Text>
        </Group>
      </Button>
      <Button
        size="compact-sm"
        variant="default"
        onClick={onCancelClick}
        disabled={disabled || isSaving}
      >
        {i18n.cancel}
      </Button>
      <Text size="xs" c="dimmed">
        {i18n.saveWithShortcut(keyboardShortcut)}
      </Text>
    </Group>
  );
}
