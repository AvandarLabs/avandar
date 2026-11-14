import { ColorInput, type ColorInputProps } from "@mantine/core";
import { parseHexDraft } from "./controlValues/controlValues";
import { useDraftValue } from "./useDraftValue";

type HexColorInputProps = Omit<
  ColorInputProps,
  "value" | "onChange" | "format" | "popoverProps" | "withEyeDropper"
> &
  Readonly<{
    value: string;
    /** Accepts eight-digit colours with alpha as well as six-digit ones. */
    allowAlpha: boolean;
    onChange: (color: string) => void;
  }>;

const POPOVER = { withinPortal: false } as const;

/**
 * A Mantine colour field that keeps hand-typed hex text while it is
 * incomplete, emits a lowercased colour once it is valid, and puts back the
 * last valid colour on blur. Its picker stays inside the preview dialog. For
 * example, the colour, palette, and gradient token controls use it.
 */
export function HexColorInput({
  value,
  allowAlpha,
  onChange,
  onBlur,
  ...props
}: HexColorInputProps) {
  const field = useDraftValue<string, string>({
    value,
    toKey: (color) => color,
    toDraft: (color) => color,
    parse: (draft) => parseHexDraft(draft, { allowAlpha }),
    onChange,
  });
  return (
    <ColorInput
      {...props}
      value={field.draft}
      format={allowAlpha && value.length === 9 ? "hexa" : "hex"}
      withEyeDropper={false}
      popoverProps={POPOVER}
      onChange={field.change}
      onBlur={(event) => {
        if (!field.isValid) {
          field.revert();
        }
        onBlur?.(event);
      }}
    />
  );
}
