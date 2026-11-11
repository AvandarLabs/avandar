import { Text } from "@mantine/core";
import clsx from "clsx";
import { useCheckTruncatedText } from "../hooks/useCheckTruncatedText/useCheckTruncatedText";
import { Tooltip } from "../Tooltip/Tooltip";
import css from "./TruncatedText.module.css";
import type { TextProps, TooltipProps } from "@mantine/core";
import type { ReactNode } from "react";

type TooltipPassthroughProps = Omit<
  TooltipProps,
  "children" | "label" | "disabled"
>;

type Props = {
  children: string;

  /**
   * When false, hovering a clipped label does not show the full text.
   * Defaults to true.
   */
  withFullTextTooltip?: boolean;

  /**
   * Replaces the full-text tooltip and is shown even when the text fits,
   * so a row can explain a state such as being unavailable.
   */
  tooltipLabel?: ReactNode;
  tooltipProps?: TooltipPassthroughProps;
} & Omit<TextProps, "children" | "truncate" | "display">;

/**
 * One line of text that ends in an ellipsis when it does not fit its parent.
 * Hovering a clipped label shows the full text. The parent must be allowed
 * to shrink (`min-width: 0`) or the line never clips.
 */
export function TruncatedText({
  children,
  className,
  withFullTextTooltip = true,
  tooltipLabel,
  tooltipProps,
  ...textProps
}: Props): JSX.Element {
  const [textRef, isTextTruncated] =
    useCheckTruncatedText<HTMLParagraphElement>([children]);
  const text = (
    <Text
      span
      className={clsx(css.root, className)}
      truncate
      ref={textRef}
      {...textProps}
    >
      {children}
    </Text>
  );

  if (!withFullTextTooltip && tooltipLabel === undefined) {
    return text;
  }

  return (
    <Tooltip
      position="top"
      {...tooltipProps}
      label={tooltipLabel ?? children}
      disabled={tooltipLabel === undefined && !isTextTruncated}
    >
      {text}
    </Tooltip>
  );
}
