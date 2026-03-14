import {
  ActionIcon,
  Box,
  Button,
  Group,
  Text,
  Textarea,
} from "@mantine/core";
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
   * Called when the user saves.
   * Keep this as a pure callback (no internal API logic in this component).
   */
  onSave: (value: string) => void | Promise<void>;

  /**
   * Called when the user cancels editing.
   */
  onCancel?: () => void;
  isSaving?: boolean;
  disabled?: boolean;
  minRows?: number;
  maxRows?: number;
  emptyStateText?: string;
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
  emptyStateText = "No description provided yet.",
  editIconLabel = "Edit text",
  ...textareaProps
}: Props): JSX.Element {
  const [isEditing, setIsEditing] = useState(false);
  const [isSavingInternal, setIsSavingInternal] = useState(false);

  const isSubmitting = isSaving || isSavingInternal;
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

  useEffect(() => {
    if (!isEditing) {
      setIsSavingInternal(false);
    }
  }, [isEditing]);

  const handleStartEditing = (): void => {
    if (disabled) {
      return;
    }
    setIsEditing(true);
  };

  const handleCancel = (): void => {
    if (disabled || isSubmitting) {
      return;
    }
    onCancel?.();
    setIsEditing(false);
  };

  const handleSave = async (): Promise<void> => {
    if (disabled || isSubmitting) {
      return;
    }

    setIsSavingInternal(true);
    try {
      await onSave(value);
      setIsEditing(false);
    } catch {
      // Keep the component in edit mode and defer error handling to the parent.
    } finally {
      setIsSavingInternal(false);
    }
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
                void handleSave();
              },
            ],
            [
              "Escape",
              (event) => {
                event.preventDefault();
                handleCancel();
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
              void handleSave();
            }}
            loading={isSubmitting}
            disabled={disabled}
          >
            Save
          </Button>
          <Button
            size="compact-sm"
            variant="default"
            onClick={handleCancel}
            disabled={disabled || isSubmitting}
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
        {hasText ? value : emptyStateText}
      </Text>
      <ActionIcon
        variant="subtle"
        color="gray"
        aria-label={editIconLabel}
        onClick={handleStartEditing}
        disabled={disabled}
      >
        <IconPencil size={16} />
      </ActionIcon>
    </Group>
  );
}
