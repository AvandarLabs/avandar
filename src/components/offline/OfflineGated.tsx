import { Box } from "@mantine/core";
import { Tooltip } from "@ui";
import clsx from "clsx";
import { Children, cloneElement, isValidElement } from "react";
import css from "@/components/offline/OfflineGated.module.css";
import { OfflineUnavailableTooltipLabel } from "@/components/offline/OfflineUnavailableTooltipLabel";
import type { MouseEvent, ReactElement, ReactNode } from "react";

type Props = {
  /** When true, the child is grayed out and shows the offline tooltip. */
  isBlocked: boolean;
  children: ReactNode;
  className?: string;
};

function blockPointerEvent(event: MouseEvent): void {
  event.preventDefault();
  event.stopPropagation();
}

/**
 * Wraps a single interactive child with muted styling and the standard
 * offline-unavailable tooltip when blocked.
 */
export function OfflineGated({
  isBlocked,
  children,
  className,
}: Props): JSX.Element {
  if (!isBlocked) {
    return <>{children}</>;
  }

  const child = Children.only(children);

  if (!isValidElement(child)) {
    return <>{children}</>;
  }

  const gatedChild = cloneElement(child as ReactElement, {
    "aria-disabled": true,
    tabIndex: -1,
    onClick: blockPointerEvent,
    onClickCapture: blockPointerEvent,
  });

  return (
    <Tooltip label={<OfflineUnavailableTooltipLabel />}>
      <Box
        className={clsx(css.gated, css.gatedInteractive, className)}
        component="span"
        display="block"
        onClickCapture={blockPointerEvent}
      >
        {gatedChild}
      </Box>
    </Tooltip>
  );
}
