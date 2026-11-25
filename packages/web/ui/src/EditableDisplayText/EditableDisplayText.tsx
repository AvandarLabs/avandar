import { Box, Group, Text } from "@mantine/core";
import { useI18nMessages } from "@ui/i18n/useI18nMessages";
import { useState } from "react";
import { EditButton } from "../buttons/EditButton";
import { TruncatedText } from "../text/TruncatedText";
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

  return (
    <Group gap="xxs" align="center" wrap="nowrap" w="100%" miw={0}>
      <Box miw={0} style={{ flex: 1 }}>
        <TruncatedText
          c={hasText ? undefined : "dimmed"}
          fs={hasText ? undefined : "italic"}
          tooltipProps={{ position: "top" }}
          {...displayTextProps}
        >
          {hasText ? value : resolvedEmptyDisplayText}
        </TruncatedText>
      </Box>
      <Box style={{ flexShrink: 0 }}>
        <EditButton onClick={onStartEditing} disabled={disabled} name={name} />
      </Box>
    </Group>
  );
}
