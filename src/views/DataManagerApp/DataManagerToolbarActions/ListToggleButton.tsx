import { useLingui } from "@lingui/react/macro";
import { Button } from "@mantine/core";
import {
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
} from "@tabler/icons-react";
import type { ReactNode } from "react";

type Props = {
  isListShown: boolean;
  onToggle: () => void;
};

/**
 * Shows or hides the Data Sources list on a task view, which hides it by
 * default to give its tables the width.
 */
export function ListToggleButton({
  isListShown,
  onToggle,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const Icon = isListShown
    ? IconLayoutSidebarLeftCollapse
    : IconLayoutSidebarLeftExpand;
  return (
    <Button
      variant="subtle"
      color="neutral"
      size="compact-sm"
      leftSection={<Icon size={18} aria-hidden />}
      aria-expanded={isListShown}
      onClick={onToggle}
    >
      {isListShown ? t`Hide list` : t`Show list`}
    </Button>
  );
}
