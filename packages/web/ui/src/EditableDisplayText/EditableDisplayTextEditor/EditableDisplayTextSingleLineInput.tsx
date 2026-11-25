import { TextInput } from "@mantine/core";
import { useEditableTextInput } from "./useEditableTextInput";
import type { EditableDisplayTextInputProps } from "../EditableDisplayText.types";
import type { EditableDisplayTextEditorInputProps } from "./EditableDisplayTextEditor.types";

type Props = EditableDisplayTextEditorInputProps & {
  passThroughProps: Extract<
    EditableDisplayTextInputProps,
    { textarea?: false | undefined }
  >;
};

/** Single-line value input used by EditableDisplayTextEditor. */
export function EditableDisplayTextSingleLineInput({
  name,
  value,
  onChange,
  onSaveClick,
  onCancelClick,
  shouldFillWidth,
  passThroughProps,
}: Readonly<Props>): JSX.Element {
  const { inputRef, onKeyDown, inputStyles } =
    useEditableTextInput<HTMLInputElement>({
      onSaveClick,
      onCancelClick,
      shouldFillWidth,
      isTextarea: false,
    });
  const inputProps = passThroughProps;
  return (
    <TextInput
      ref={inputRef}
      variant="unstyled"
      name={name}
      value={value}
      onChange={(event) => {
        onChange(event.currentTarget.value);
      }}
      onKeyDown={onKeyDown}
      styles={inputStyles}
      {...inputProps}
    />
  );
}
