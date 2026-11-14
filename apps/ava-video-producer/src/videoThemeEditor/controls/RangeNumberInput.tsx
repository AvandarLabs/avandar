import { NumberInput, type NumberInputProps } from "@mantine/core";
import { useRowHasIssue } from "../RowIssueContext/RowIssueContext";
import { toNumberInRange } from "./controlValues/controlValues";
import { useDraftValue } from "./useDraftValue";

type RangeNumberInputProps = Omit<
  NumberInputProps,
  "value" | "onChange" | "min" | "max"
> &
  Readonly<{
    value: number;
    min: number;
    max: number;
    onChange: (value: number) => void;
  }>;

/**
 * A Mantine number field that emits only numbers inside `min`..`max`. What
 * is typed stays on screen while it is incomplete or out of range, and the
 * field clamps on blur. For example, a camera curve point never leaves 0..1.
 */
export function RangeNumberInput({
  value,
  min,
  max,
  onChange,
  onBlur,
  error,
  ...props
}: RangeNumberInputProps) {
  const hasIssue = useRowHasIssue();
  const field = useDraftValue<number, number | string>({
    value,
    toKey: String,
    toDraft: (current) => current,
    parse: (draft) => toNumberInRange(draft, min, max),
    onChange,
  });
  return (
    <NumberInput
      {...props}
      error={error ?? hasIssue}
      min={min}
      max={max}
      value={field.draft}
      onChange={field.change}
      onBlur={(event) => {
        // Mantine has already clamped a number on blur, so only text that is
        // not a number yet, such as "0.", goes back to the last value.
        if (typeof field.draft !== "number") {
          field.revert();
        }
        onBlur?.(event);
      }}
    />
  );
}
