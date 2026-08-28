import { Card, Stack, Text, Title } from "@mantine/core";
import { NuxStateManager } from "@/components/Nux/NuxStateManager/NuxStateManager";
import { NuxTooltipFooter } from "@/components/Nux/NuxTour/NuxTooltip/NuxTooltipFooter";
import { useNuxAnchorPresent } from "@/components/Nux/NuxTour/useNuxAnchorPresent";
import { ANIMATION_PRESET } from "@/config/Theme";
import type { NuxJoyrideStepData } from "@/components/Nux/NuxTour/makeJoyrideStepsFromMilestone/makeJoyrideStepsFromMilestone";
import type { ReactNode } from "react";
import type { TooltipRenderProps } from "react-joyride";

function _tourButtonVisibility(options: {
  index: number;
  isGateAnchorPresent: boolean;
  stepData: NuxJoyrideStepData | undefined;
}): { hasBack: boolean; hasNext: boolean } {
  const isEventGated = options.stepData?.disableNextUntilEvent !== undefined;
  const isAnchorGated = options.stepData?.disableNextUntilAnchor !== undefined;
  return {
    hasBack: options.index > 0 && options.stepData?.hideBack !== true,
    hasNext: !isEventGated && (!isAnchorGated || options.isGateAnchorPresent),
  };
}

/**
 * The tutorial's tooltip body.
 *
 * Replaces Joyride's default chrome entirely so the tooltip is a Mantine
 * surface like everything else in the product, rather than a third-party
 * widget wearing our colours. Step copy, including any links, arrives as
 * `step.content` from the tutorial definition.
 */
export function NuxTooltip({
  backProps,
  closeProps,
  index,
  primaryProps,
  size,
  step,
  tooltipProps,
}: Readonly<TooltipRenderProps>): ReactNode {
  const dispatch = NuxStateManager.useDispatch();
  const isLastStep = index === size - 1;
  const stepData = step.data as NuxJoyrideStepData | undefined;
  const isGateAnchorPresent = useNuxAnchorPresent(
    stepData?.disableNextUntilAnchor,
  );
  const { hasBack, hasNext } = _tourButtonVisibility({
    index,
    isGateAnchorPresent,
    stepData,
  });

  return (
    <Card
      {...tooltipProps}
      className={ANIMATION_PRESET.popIn.className}
      withBorder
      shadow="md"
      padding="md"
      maw={380}
    >
      <Stack gap="xs">
        {step.title ? (
          <Title order={4} size="h5">
            {step.title}
          </Title>
        ) : null}
        <Text size="sm">{step.content}</Text>
        <NuxTooltipFooter
          backProps={backProps}
          closeProps={closeProps}
          closeTour={dispatch.closeTour}
          hasBack={hasBack}
          hasNext={hasNext}
          isLastStep={isLastStep}
          primaryProps={primaryProps}
        />
        <Text size="xs" c="dimmed" ta="right">
          {index + 1} / {size}
        </Text>
      </Stack>
    </Card>
  );
}
