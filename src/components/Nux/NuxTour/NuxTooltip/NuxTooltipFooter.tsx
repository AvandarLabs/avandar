import { Trans } from "@lingui/react/macro";
import { Button, Group } from "@mantine/core";
import type { MouseEvent, ReactNode } from "react";
import type { TooltipRenderProps } from "react-joyride";

type Props = {
  backProps: TooltipRenderProps["backProps"];
  closeProps: TooltipRenderProps["closeProps"];
  closeTour: () => void;
  hasBack: boolean;
  hasNext: boolean;
  isLastStep: boolean;
  primaryProps: TooltipRenderProps["primaryProps"];
};

function _closeTourWithoutJoyrideAdvance(
  event: MouseEvent<HTMLButtonElement>,
  closeTour: () => void,
): void {
  // Joyride's close() increments the step index, which in controlled mode
  // starts waiting for the next tooltip's target: full gray overlay and a
  // center loader. Collapse ourselves instead.
  event.preventDefault();
  closeTour();
}

/** Close, Back, and Next/Done controls for a NUX tooltip. */
export function NuxTooltipFooter({
  backProps,
  closeProps,
  closeTour,
  hasBack,
  hasNext,
  isLastStep,
  primaryProps,
}: Readonly<Props>): ReactNode {
  return (
    <Group justify="space-between" mt="xs" wrap="nowrap">
      <Button
        {...closeProps}
        onClick={(event) => {
          _closeTourWithoutJoyrideAdvance(event, closeTour);
        }}
        variant="default"
        size="xs"
      >
        <Trans>Close</Trans>
      </Button>
      <Group gap="xs" wrap="nowrap">
        {hasBack ?
          <Button {...backProps} variant="default" size="xs">
            <Trans>Back</Trans>
          </Button>
        : null}
        {hasNext ?
          <Button {...primaryProps} size="xs">
            {isLastStep ?
              <Trans>Done</Trans>
            : <Trans>Next</Trans>}
          </Button>
        : null}
      </Group>
    </Group>
  );
}
