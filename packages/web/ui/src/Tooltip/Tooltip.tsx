import { Tooltip as MantineTooltip } from "@mantine/core";
import type { TooltipProps } from "@mantine/core";

type Props = TooltipProps;

const _TOOLTIP_TEXT_WRAP = {
  overflowWrap: "anywhere" as const,
  wordBreak: "break-word" as const,
};

/**
 * Ensures long unbroken strings (e.g. filenames) wrap inside `maw`.
 */
function _mergeTooltipStyles(
  stylesProp: TooltipProps["styles"] | undefined,
): TooltipProps["styles"] {
  if (!stylesProp) {
    return { tooltip: _TOOLTIP_TEXT_WRAP };
  }

  if (typeof stylesProp === "function") {
    return (theme, ...args) => {
      const resolved = stylesProp(theme, ...args);
      const prior =
        typeof resolved?.tooltip === "object" && resolved.tooltip !== null ?
          resolved.tooltip
        : {};

      return {
        ...resolved,
        tooltip: { ..._TOOLTIP_TEXT_WRAP, ...prior },
      };
    };
  }

  const prior =
    typeof stylesProp.tooltip === "object" && stylesProp.tooltip !== null ?
      stylesProp.tooltip
    : {};

  return {
    ...stylesProp,
    tooltip: { ..._TOOLTIP_TEXT_WRAP, ...prior },
  };
}

/**
 * Styled tooltip component with Avandar design defaults.
 */
export function Tooltip({
  children,
  color = "neutral.9",
  fz = "md",
  maw = 340,
  withArrow = true,
  multiline = true,
  transitionProps = { transition: "pop" },
  styles,
  ...props
}: Props): JSX.Element {
  return (
    <MantineTooltip
      color={color}
      fz={fz}
      maw={maw}
      withArrow={withArrow}
      multiline={multiline}
      transitionProps={{ transition: "pop", ...transitionProps }}
      styles={_mergeTooltipStyles(styles)}
      {...props}
    >
      {children}
    </MantineTooltip>
  );
}
