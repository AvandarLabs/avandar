import { ColorInput, type ColorInputProps } from "@mantine/core";
import { useMemo, useState, type ReactNode } from "react";
import { useRowHasIssue } from "../RowIssueContext/RowIssueContext";
import { parseHexDraft } from "./controlValueHelpers/controlValueHelpers";
import {
  isColorPopoverOpenAfter,
  type ColorPopoverEvent,
} from "./isColorPopoverOpenAfter/isColorPopoverOpenAfter";
import { useDraftValue } from "./useDraftValue";

type Props = Omit<
  ColorInputProps,
  | "value"
  | "onChange"
  | "format"
  | "popoverProps"
  | "withEyeDropper"
  | "attributes"
> &
  Readonly<{
    value: string;
    /** Accepts eight-digit colours with alpha as well as six-digit ones. */
    allowAlpha: boolean;
    onChange: (color: string) => void;
  }>;

type PopoverHandlerProps = Pick<
  ColorInputProps,
  "onChange" | "onFocus" | "onClick" | "onKeyDown" | "onBlur"
>;

// The colour chip is a non-text part, so an inherited token row dims it.
const ATTRIBUTES = { colorPreview: { "data-inherit-dim": true } } as const;

/**
 * The keydown handler of the colour field. Enter and Escape close the picker.
 * While it is open, Escape stops here so the preview dialog does not close
 * with it.
 */
function _createKeyDownHandler(
  options: Readonly<{
    isOpen: boolean;
    reactTo: (event: ColorPopoverEvent) => void;
    onKeyDown: PopoverHandlerProps["onKeyDown"];
  }>,
): NonNullable<PopoverHandlerProps["onKeyDown"]> {
  const { isOpen, reactTo, onKeyDown } = options;
  return (event) => {
    if (event.key === "Enter") {
      reactTo("enter");
    }
    if (event.key === "Escape") {
      if (isOpen) {
        // The preview dialog closes on an Escape nobody handled, and it
        // checks `defaultPrevented`, so this press only closes the picker.
        event.preventDefault();
        event.stopPropagation();
      }
      reactTo("escape");
    }
    onKeyDown?.(event);
  };
}

/**
 * Whether the picker is open, and the field handlers that open and close it.
 */
function useColorPopoverHandlers(
  options: Readonly<{
    field: Readonly<{
      isValid: boolean;
      change: (draft: string) => void;
      revert: () => void;
    }>;
    onFocus: PopoverHandlerProps["onFocus"];
    onClick: PopoverHandlerProps["onClick"];
    onKeyDown: PopoverHandlerProps["onKeyDown"];
    onBlur: PopoverHandlerProps["onBlur"];
  }>,
) {
  const { field, onFocus, onClick, onKeyDown, onBlur } = options;
  const [isOpen, setOpen] = useState(false);
  const popoverProps = useMemo(() => {
    return { withinPortal: false, opened: isOpen };
  }, [isOpen]);
  const reactTo = (event: ColorPopoverEvent) => {
    return setOpen(isColorPopoverOpenAfter(event));
  };
  const handlers: PopoverHandlerProps = {
    onChange: (typedText) => {
      reactTo("type");
      field.change(typedText);
    },
    onFocus: (event) => {
      reactTo("focus");
      onFocus?.(event);
    },
    onClick: (event) => {
      reactTo("click");
      onClick?.(event);
    },
    onKeyDown: _createKeyDownHandler({ isOpen, reactTo, onKeyDown }),
    onBlur: (event) => {
      reactTo("blur");
      if (!field.isValid) {
        field.revert();
      }
      onBlur?.(event);
    },
  };
  return { popoverProps, handlers };
}

/**
 * A Mantine colour field that keeps hand-typed hex text while it is
 * incomplete, emits a lowercased colour once it is valid, and puts back the
 * last valid colour on blur. Its picker stays inside the preview dialog, and
 * closes on Enter, Escape, and blur so it does not cover the rows below. While
 * it is open, Escape is handled here and does not reach the dialog. For
 * example, the colour, palette, and gradient token controls use it.
 */
export function HexColorInput({
  value,
  allowAlpha,
  onChange,
  onBlur,
  onFocus,
  onClick,
  onKeyDown,
  error,
  ...props
}: Props): ReactNode {
  const hasIssue = useRowHasIssue();
  const field = useDraftValue<string, string>({
    value,
    toKey: (color) => {
      return color;
    },
    toDraft: (color) => {
      return color;
    },
    parse: (draft) => {
      return parseHexDraft(draft, { allowAlpha });
    },
    onChange,
  });
  const { popoverProps, handlers } = useColorPopoverHandlers({
    field,
    onFocus,
    onClick,
    onKeyDown,
    onBlur,
  });
  return (
    <ColorInput
      {...props}
      {...handlers}
      error={error ?? hasIssue}
      value={field.draft}
      format={allowAlpha && value.length === 9 ? "hexa" : "hex"}
      withEyeDropper={false}
      popoverProps={popoverProps}
      attributes={ATTRIBUTES}
    />
  );
}
