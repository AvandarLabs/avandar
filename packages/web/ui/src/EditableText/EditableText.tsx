import { ActionIcon, Box, Button, Group, Text, Textarea } from "@mantine/core";
import { getHotkeyHandler } from "@mantine/hooks";
import { IconPencil } from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
import type { TextareaProps } from "@mantine/core";

type Props = {
  /**
   * The current text value. This makes the component controlled.
   */
  value: string;

  /**
   * Called whenever the text changes in edit mode.
   */
  onChange: (value: string) => void;

  /**
   * Called when the user clicks save.
   */
  onSave: (value: string) => void;

  /**
   * Called when the user cancels editing.
   */
  onCancel?: () => void;
  isSaving?: boolean;
  disabled?: boolean;

  /** Min rows for the editable text area */
  minRows?: number;

  /** Max rows for the editable text area */
  maxRows?: number;

  /** Display text to show when `value` is empty */
  emptyDisplayText?: string;
  editIconLabel?: string;
} & Omit<TextareaProps, "value" | "onChange" | "onSubmit">;

export function EditableText({
  value,
  onChange,
  onSave,
  onCancel,
  isSaving = false,
  disabled = false,
  minRows = 2,
  maxRows = 8,
  emptyDisplayText = "Empty",
  editIconLabel = "Edit text",
  ...textareaProps
}: Props): JSX.Element {
  const [isEditing, setIsEditing] = useState(false);
  const hasText = value.trim().length > 0;

  const isMac = useMemo(() => {
    if (typeof navigator === "undefined") {
      return false;
    }
    const userAgentData = (
      navigator as Navigator & {
        userAgentData?: { platform: string };
      }
    ).userAgentData;

    if (userAgentData?.platform) {
      return /Mac|iPhone|iPod|iPad/i.test(userAgentData.platform);
    }

    return /Mac|iPhone|iPod|iPad/i.test(navigator.userAgent);
  }, []);
  const keyboardShortcut = isMac ? "⌘↵" : "Ctrl↵";

  const onStartEditing = () => {
    if (disabled) {
      return;
    }
    setIsEditing(true);
  };

  const onCancelClick = () => {
    if (disabled || isSaving) {
      return;
    }
    onCancel?.();
    setIsEditing(false);
  };

  const onSaveClick = () => {
    if (disabled || isSaving) {
      return;
    }

    onSave(value);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <Box
        p="xs"
        bdrs="sm"
        bd="1px dashed var(--mantine-color-neutral-4)"
        bg="neutral.0"
      >
        <Textarea
          variant="unstyled"
          autosize
          minRows={minRows}
          maxRows={maxRows}
          value={value}
          onChange={(event) => {
            onChange(event.currentTarget.value);
          }}
          onKeyDown={getHotkeyHandler([
            [
              "mod+Enter",
              (event) => {
                event.preventDefault();
                onSaveClick();
              },
            ],
            [
              "Escape",
              (event) => {
                event.preventDefault();
                onCancelClick();
              },
            ],
          ])}
          styles={{
            input: {
              padding: 0,
              border: 0,
              fontSize: "inherit",
              lineHeight: "inherit",
              color: "inherit",
            },
          }}
          {...textareaProps}
        />
        <Group mt="xxs" gap="xs">
          <Button
            size="compact-sm"
            variant="light"
            onClick={() => {
              void onSaveClick();
            }}
            loading={isSaving}
            disabled={disabled}
          >
            Save
          </Button>
          <Button
            size="compact-sm"
            variant="default"
            onClick={onCancelClick}
            disabled={disabled || isSaving}
          >
            Cancel
          </Button>
          <Text size="xs" c="dimmed">
            {keyboardShortcut} to save
          </Text>
        </Group>
      </Box>
    );
  }

  return (
    <Group gap="xxs" align="start" wrap="nowrap">
      <Text
        style={{ whiteSpace: "pre-wrap" }}
        c={hasText ? undefined : "dimmed"}
        fs={hasText ? undefined : "italic"}
      >
        {hasText ? value : emptyDisplayText}
      </Text>
      <ActionIcon
        variant="subtle"
        color="gray"
        aria-label={editIconLabel}
        onClick={onStartEditing}
        disabled={disabled}
      >
        <IconPencil size={16} />
      </ActionIcon>
    </Group>
  );
}
