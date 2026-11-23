import { Box, Group, Text } from "@mantine/core";
import { useI18nMessages } from "@ui/i18n/useI18nMessages";
import { useState } from "react";
import { EditButton } from "../buttons/EditButton";
import { useCheckTruncatedText } from "../hooks/useCheckTruncatedText/useCheckTruncatedText";
import { Tooltip } from "../Tooltip/Tooltip";
import { EditableDisplayTextEditor } from "./EditableDisplayTextEditor/EditableDisplayTextEditor";
import type { EditableDisplayTextProps as Props } from "./EditableDisplayText.types";

/** Controlled inline text with display, save, and cancel states. */
export function EditableDisplayText({
  name,
  value,
  onChange,
  onSave,
  onCancel,
  isSaving = false,
  disabled = false,
  emptyDisplayText,
  isSaveDisabled = false,
  displayTextProps,
  ...passThroughProps
}: Props): JSX.Element {
  const i18n = useI18nMessages();
  const resolvedEmptyDisplayText = emptyDisplayText ?? i18n.empty;
  const [isEditing, setIsEditing] = useState(false);
  const hasText = value.trim().length > 0;

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

  const [displayTextRef, isDisplayTextTruncated] =
    useCheckTruncatedText<HTMLParagraphElement>([
      value,
      hasText,
      resolvedEmptyDisplayText,
      passThroughProps.textarea,
    ]);

  if (isEditing) {
    return (
      <EditableDisplayTextEditor
        name={name}
        value={value}
        onChange={onChange}
        onSaveClick={onSaveClick}
        onCancelClick={onCancelClick}
        isSaving={isSaving}
        disabled={disabled}
        isSaveDisabled={isSaveDisabled}
        passThroughProps={passThroughProps}
      />
    );
  }

  if (passThroughProps.textarea) {
    return (
      <Group gap="xxs" align="center" wrap="nowrap" justify="space-between">
        <Text
          style={{ whiteSpace: "pre-wrap" }}
          c={hasText ? undefined : "dimmed"}
          fs={hasText ? undefined : "italic"}
          {...displayTextProps}
        >
          {hasText ? value : resolvedEmptyDisplayText}
        </Text>
        <EditButton onClick={onStartEditing} disabled={disabled} name={name} />
      </Group>
    );
  }

  const labelForTooltip = hasText ? value : resolvedEmptyDisplayText;

  return (
    <Group gap="xxs" align="center" wrap="nowrap" w="100%" miw={0}>
      <Box miw={0} style={{ flex: 1 }}>
        <Tooltip
          label={labelForTooltip}
          disabled={!isDisplayTextTruncated}
          position="top"
        >
          <Text
            ref={displayTextRef}
            display="block"
            truncate
            w="100%"
            maw="100%"
            miw={0}
            c={hasText ? undefined : "dimmed"}
            fs={hasText ? undefined : "italic"}
            {...displayTextProps}
          >
            {hasText ? value : resolvedEmptyDisplayText}
          </Text>
        </Tooltip>
      </Box>
      <Box style={{ flexShrink: 0 }}>
        <EditButton onClick={onStartEditing} disabled={disabled} name={name} />
      </Box>
    </Group>
  );
}
