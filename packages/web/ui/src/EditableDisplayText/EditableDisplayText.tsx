import {
  ActionIcon,
  Box,
  Button,
  Group,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import { getHotkeyHandler } from "@mantine/hooks";
import { IconPencil } from "@tabler/icons-react";
import { hasDefinedProps } from "@utils/guards/hasDefinedProps/hasDefinedProps";
import { isPlainObject } from "@utils/guards/isPlainObject/isPlainObject";
import { useMemo, useState } from "react";
import type { TextareaProps, TextInputProps, TextProps } from "@mantine/core";

type BaseProps = {
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

  /** Display text to show when `value` is empty */
  emptyDisplayText?: string;
  editIconLabel?: string;
  isSaveDisabled?: boolean;
  displayTextProps?: TextProps;
};

type TextInputVariantProps = BaseProps & {
  /**
   * Whether or not to render the component as a textarea.
   * @default false
   */
  textarea?: false;
};

type TextareaVariantProps = BaseProps & {
  /**
   * Whether or not to render the component as a textarea.
   * @default false
   */
  textarea: true;

  /** Min rows for the editable text area */
  minRows?: number;

  /** Max rows for the editable text area */
  maxRows?: number;
};

type Props =
  | (TextInputVariantProps &
      Omit<TextInputProps, "value" | "onChange" | "onSubmit">)
  | (TextareaVariantProps &
      Omit<
        TextareaProps,
        "value" | "onChange" | "onSubmit" | "minRows" | "maxRows"
      >);

export function EditableDisplayText({
  value,
  onChange,
  onSave,
  onCancel,
  isSaving = false,
  disabled = false,
  emptyDisplayText = "Empty",
  editIconLabel = "Edit text",
  isSaveDisabled = false,
  displayTextProps,
  ...passThroughProps
}: Props): JSX.Element {
  const [isEditing, setIsEditing] = useState(false);
  const hasText = value.trim().length > 0;
  const hasExplicitWidth =
    (!passThroughProps.textarea && hasDefinedProps(passThroughProps, "w")) ||
    (isPlainObject(passThroughProps.style) &&
      hasDefinedProps(passThroughProps.style, "width"));
  const singleLineInputWidth = `calc(${Math.max(value.length, 1)}ch + 1rem)`;

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
  const keyboardShortcut =
    passThroughProps.textarea ?
      isMac ? "⌘↵"
      : "Ctrl↵"
    : "Enter";

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
    if (disabled || isSaving || isSaveDisabled) {
      return;
    }

    onSave(value);
    setIsEditing(false);
  };

  const inputStyles = {
    input: {
      padding: 0,
      border: 0,
      fontSize: "inherit",
      lineHeight: "inherit",
      color: "inherit",
      width:
        !passThroughProps.textarea && !hasExplicitWidth ?
          singleLineInputWidth
        : undefined,
      fieldSizing:
        !passThroughProps.textarea && !hasExplicitWidth ?
          ("content" as const)
        : undefined,
    },
  };

  const elements = {
    textInput() {
      if (passThroughProps.textarea) {
        return null;
      }
      return (
        <TextInput
          variant="unstyled"
          value={value}
          onChange={(event) => {
            onChange(event.currentTarget.value);
          }}
          onKeyDown={getHotkeyHandler([
            [
              "Enter",
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
          styles={inputStyles}
          {...passThroughProps}
        />
      );
    },
    textarea() {
      if (!passThroughProps.textarea) {
        return null;
      }
      const { minRows = 2, maxRows = 8, ...textareaProps } = passThroughProps;

      return (
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
          styles={inputStyles}
          {...textareaProps}
        />
      );
    },
  };

  if (isEditing) {
    return (
      <Box
        p="xs"
        bdrs="sm"
        bd="1px dashed var(--mantine-color-neutral-4)"
        bg="neutral.0"
        w={
          !passThroughProps.textarea && !hasExplicitWidth ?
            "fit-content"
          : undefined
        }
        maw="100%"
      >
        {passThroughProps.textarea ? elements.textarea() : elements.textInput()}
        <Group mt="xxs" gap="xs">
          <Button
            size="compact-sm"
            variant="light"
            onClick={() => {
              onSaveClick();
            }}
            loading={isSaving}
            disabled={disabled || isSaveDisabled}
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
        {...displayTextProps}
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
