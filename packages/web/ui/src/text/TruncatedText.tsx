import type { TextProps, TooltipProps } from "@mantine/core";

import { Text } from "@mantine/core";

import { useCheckTruncatedText } from "../hooks/useCheckTruncatedText/useCheckTruncatedText";
import { Tooltip } from "../Tooltip/Tooltip";

type TooltipPassthroughProps = Omit<
  TooltipProps,
  "children" | "label" | "disabled"
>;

type Props = {
  children: string;
  withFullTextTooltip?: boolean;
  tooltipProps?: TooltipPassthroughProps;
} & Omit<TextProps, "children" | "truncate" | "display">;

export function TruncatedText({
  children,
  maw = 250,
  withFullTextTooltip = false,
  tooltipProps,
  ...textProps
}: Props): JSX.Element {
  const [textRef, isTextTruncated] =
    useCheckTruncatedText<HTMLParagraphElement>([children]);

  const textContents = (
    <Text span maw={maw} truncate ref={textRef} display="block" {...textProps}>
      {children}
    </Text>
  );

  return withFullTextTooltip ? (
    <Tooltip
      position="left"
      withArrow
      {...tooltipProps}
      label={children}
      disabled={!isTextTruncated}
    >
      {textContents}
    </Tooltip>
  ) : (
    textContents
  );
}
