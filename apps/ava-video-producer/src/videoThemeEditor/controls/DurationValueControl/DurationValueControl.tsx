import { Group } from "@mantine/core";
import { RangeNumberInput } from "../RangeNumberInput";
import css from "./DurationValueControl.module.css";
import type { ValueControlProps } from "../valueControl.types";
import type { ReactNode } from "react";

type Props = ValueControlProps;

/** A duration token in frames, with its length in milliseconds beside it. */
export function DurationValueControl({
  label,
  definition,
  value,
  onChange,
}: Readonly<Props>): ReactNode {
  const frames = typeof value === "number" ? value : 0;
  const milliseconds = Math.round((frames / 30) * 1000);
  return (
    <Group className={css.durationValueControlRow} gap="xs" wrap="nowrap">
      <RangeNumberInput
        className={css.durationValueControlInput}
        size="xs"
        aria-label={label}
        min={definition.min ?? 0}
        max={definition.max ?? 600}
        step={1}
        allowDecimal={false}
        suffix=" frames"
        value={frames}
        onChange={onChange}
      />
      <span
        className={css.durationValueControlReadout}
      >{`${milliseconds} ms`}</span>
    </Group>
  );
}
