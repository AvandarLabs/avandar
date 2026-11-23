import type { EditableDisplayTextInputProps } from "../EditableDisplayText.types";

export type EditableDisplayTextEditorProps = {
  name?: string;
  value: string;
  onChange: (value: string) => void;
  onSaveClick: () => void;
  onCancelClick: () => void;
  isSaving: boolean;
  disabled: boolean;
  isSaveDisabled: boolean;
  passThroughProps: EditableDisplayTextInputProps;
};

/** Common focus, value, and shortcut options for inline editing inputs. */
export type EditableDisplayTextEditorInputProps = Pick<
  EditableDisplayTextEditorProps,
  "name" | "value" | "onChange" | "onSaveClick" | "onCancelClick"
> & {
  shouldFillWidth: boolean;
};
