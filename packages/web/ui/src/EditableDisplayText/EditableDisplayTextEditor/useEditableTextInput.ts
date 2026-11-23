import { getHotkeyHandler } from "@mantine/hooks";
import { useEffect, useRef } from "react";
import type { EditableDisplayTextEditorInputProps } from "./EditableDisplayTextEditor.types";
import type { CSSProperties, RefObject } from "react";

type Props = Pick<
  EditableDisplayTextEditorInputProps,
  "onSaveClick" | "onCancelClick" | "shouldFillWidth"
> & { isTextarea: boolean };

/**
 * Focus and keyboard handling for EditableDisplayTextSingleLineInput and
 * EditableDisplayTextMultilineInput.
 */
export function useEditableTextInput<
  ElementType extends HTMLInputElement | HTMLTextAreaElement,
>({
  onSaveClick,
  onCancelClick,
  shouldFillWidth,
  isTextarea,
}: Readonly<Props>): {
  inputRef: RefObject<ElementType | null>;
  onKeyDown: ReturnType<typeof getHotkeyHandler>;
  inputStyles: { input: CSSProperties };
} {
  const inputRef = useRef<ElementType>(null);
  useEffect(function focusEditorInput() {
    inputRef.current?.focus();
  }, []);
  const onKeyDown = getHotkeyHandler([
    [
      isTextarea ? "mod+Enter" : "Enter",
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
  ]);
  const inputStyles = {
    input: {
      padding: 0,
      border: 0,
      fontSize: "inherit",
      lineHeight: "inherit",
      color: "inherit",
      width: shouldFillWidth ? "100%" : undefined,
      minWidth: shouldFillWidth ? 0 : undefined,
    },
  };
  return { inputRef, onKeyDown, inputStyles };
}
