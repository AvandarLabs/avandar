import { Slider } from "@mantine/core";
import { useSliderIssueRef } from "../../../RowIssueContext/rowIssueHelpers";
import css from "./NumberSlider.module.css";
import type { ReactNode } from "react";

type Props = Readonly<{
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
}>;

/** The slider beside a number field, marked invalid in a row with an issue. */
export function NumberSlider({ label, ...props }: Props): ReactNode {
  const sliderRef = useSliderIssueRef();
  return (
    <Slider
      {...props}
      ref={sliderRef}
      className={css.numberSlider}
      size="sm"
      thumbLabel={label}
      label={null}
    />
  );
}
