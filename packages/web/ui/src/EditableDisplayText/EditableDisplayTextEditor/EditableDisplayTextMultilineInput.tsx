import { Textarea } from "@mantine/core";
import { useEditableTextInput } from "./useEditableTextInput";
import type { EditableDisplayTextInputProps } from "../EditableDisplayText.types";
import type { EditableDisplayTextEditorInputProps } from "./EditableDisplayTextEditor.types";

type Props = EditableDisplayTextEditorInputProps & {
  passThroughProps: Extract<EditableDisplayTextInputProps, { textarea?: true }>;
};

/** Multiline value input used by EditableDisplayTextEditor. */
export function EditableDisplayTextMultilineInput({
  name,
  value,
  onChange,
  onSaveClick,
  onCancelClick,
  shouldFillWidth,
  passThroughProps,
}: Readonly<Props>): JSX.Element {
  const { inputRef, onKeyDown, inputStyles } =
    useEditableTextInput<HTMLTextAreaElement>({
      onSaveClick,
      onCancelClick,
      shouldFillWidth,
      isTextarea: true,
    });
  const { minRows = 2, maxRows = 8, ...inputProps } = passThroughProps;
  return (
    <Textarea
      ref={inputRef}
      variant="unstyled"
      name={name}
      value={value}
      onChange={(event) => {
        onChange(event.currentTarget.value);
      }}
      onKeyDown={onKeyDown}
      styles={inputStyles}
      autosize
      minRows={minRows}
      maxRows={maxRows}
      {...inputProps}
    />
  );
}
