import { Text, type TextProps, type TooltipProps } from "@mantine/core";
import { Tooltip } from "@ui/Tooltip/Tooltip";
import { useWindowEvent } from "@mantine/hooks";
import { isArray } from "@utils/guards/isArray/isArray";
import {
  DependencyList,
  RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

type TooltipPassthroughProps = Omit<
  TooltipProps,
  "children" | "label" | "disabled"
>;

type Props = {
  children: string;
  withFullTextTooltip?: boolean;
  /** Extra props for the tooltip (e.g. position in modals). */
  tooltipProps?: TooltipPassthroughProps;
} & Omit<TextProps, "children" | "truncate" | "display">;

function useCheckTruncatedText(
  dependencies: unknown | DependencyList = [],
): [textRef: RefObject<HTMLDivElement | null>, isTextTruncated: boolean] {
  const textRef = useRef<HTMLDivElement>(null);
  const [isTextTruncated, setIsTextTruncated] = useState(false);

  const checkTruncation = useCallback(() => {
    if (textRef.current) {
      setIsTextTruncated(
        textRef.current.scrollWidth > textRef.current.clientWidth,
      );
    }
  }, [textRef]);

  // check for truncation on component mount
  useEffect(
    () => {
      checkTruncation();
    },
    // Re-run when any of the dependencies change
    // eslint-disable-next-line react-hooks/exhaustive-deps
    isArray(dependencies) ? dependencies : [dependencies],
  );

  // Also check for truncation on window resize, in case this changes
  // the element's size
  useWindowEvent("resize", () => {
    return checkTruncation();
  });

  return [textRef, isTextTruncated];
}

export function TruncatedText({
  children,
  maw = 250,
  withFullTextTooltip: withTooltip = false,
  tooltipProps,
  ...textProps
}: Props): JSX.Element {
  const [textRef, isTextTruncated] = useCheckTruncatedText([children]);

  const textContents = (
    <Text span maw={maw} truncate ref={textRef} display="block" {...textProps}>
      {children}
    </Text>
  );

  return withTooltip ?
      <Tooltip
        position="left"
        withArrow
        {...tooltipProps}
        label={children}
        disabled={!isTextTruncated}
      >
        {textContents}
      </Tooltip>
    : textContents;
}
