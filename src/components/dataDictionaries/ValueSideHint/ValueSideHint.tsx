import { ActionIcon } from "@avandar/ui";
import { useLingui } from "@lingui/react/macro";
import { IconInfoCircle } from "@tabler/icons-react";
import type { ReactNode } from "react";

type Props = {
  /**
   * Which side of a dictionary pair the hint explains. `both` explains the
   * two sides together, for a control that names them as a pair.
   */
  side: "source" | "target" | "both";
};

/**
 * An info icon that explains what a source value or a target value is. It is
 * a button so keyboard users can reach it, and the tooltip also opens on
 * focus. It sits beside the first prominent appearance of the words "Source
 * value" and "Target value" in the dictionary screens.
 */
export function ValueSideHint({ side }: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const sourceText = t`A value as it appears in the data, such as 1 or "M".`;
  const targetText = t`What the source value is converted to when the dictionary is applied. It can be a readable label, such as "Male", or a value in another coding system.`;
  const tooltips = {
    source: sourceText,
    target: targetText,
    both: `${t`Source value`}: ${sourceText} ${t`Target value`}: ${targetText}`,
  };
  const labels = {
    source: t`What is a source value?`,
    target: t`What is a target value?`,
    both: t`What are source and target values?`,
  };
  return (
    <ActionIcon
      variant="transparent"
      color="neutral"
      size="xs"
      aria-label={labels[side]}
      tooltip={tooltips[side]}
      tooltipProps={{ maw: 280 }}
    >
      <IconInfoCircle size={14} aria-hidden />
    </ActionIcon>
  );
}
