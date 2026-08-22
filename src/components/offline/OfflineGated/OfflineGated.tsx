import { Tooltip } from "@avandar/ui";
import { Box } from "@mantine/core";
import clsx from "clsx";
import { Children, cloneElement, isValidElement } from "react";
import css from "@/components/offline/OfflineGated/OfflineGated.module.css";
import { OfflineUnavailableTooltipLabel } from "@/components/offline/OfflineUnavailableTooltipLabel";
import { useIsOnline } from "@/lib/hooks/browser/useIsOnline/useIsOnline";
import type { MouseEvent, ReactElement, ReactNode } from "react";

type Props = {
  /** Overrides the browser-derived blocked state when already known. */
  isBlocked?: boolean;
  children: ReactNode;
  className?: string;
};

function blockPointerEvent(event: MouseEvent): void {
  event.preventDefault();
  event.stopPropagation();
}

/**
 * Wraps a single interactive child with muted styling and the
 * offline-unavailable tooltip when the browser is offline. Pass-through
 * (no wrapper) when online. Self-contained: callers do not pass any
 * offline state in.
 */
export function OfflineGated({
  isBlocked,
  children,
  className,
}: Props): JSX.Element {
  const isOnline = useIsOnline();
  const shouldBlock = isBlocked ?? !isOnline;
  const child = Children.only(children);
  if (!shouldBlock || !isValidElement(child)) {
    return <>{children}</>;
  }

  const gatedChild = cloneElement(
    child as ReactElement<Record<string, unknown>>,
    {
      "aria-disabled": true,
      tabIndex: -1,
      onClick: blockPointerEvent,
      onClickCapture: blockPointerEvent,
    },
  );

  return (
    <Tooltip label={<OfflineUnavailableTooltipLabel />}>
      <Box
        className={clsx(css.offlineGatedContainer, className)}
        component="span"
        display="block"
        onClickCapture={blockPointerEvent}
      >
        {gatedChild}
      </Box>
    </Tooltip>
  );
}
