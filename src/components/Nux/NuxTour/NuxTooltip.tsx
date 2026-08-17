import { Trans } from "@lingui/react/macro";
import { Anchor, Button, Card, Group, Stack, Text, Title } from "@mantine/core";
import type { ReactNode } from "react";
import type { TooltipRenderProps } from "react-joyride";

/** Where the sample spreadsheet is served from. See `public/samples/`. */
const SAMPLE_CSV_HREF = "/samples/avandar-sample-sales.csv";

/**
 * The tutorial's tooltip body.
 *
 * Replaces Joyride's default chrome entirely so the tooltip is a Mantine
 * surface like everything else in the product, rather than a third-party
 * widget wearing our colours.
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
  const showSampleDownload =
    (step.data as { showSampleDownload?: boolean } | undefined)
      ?.showSampleDownload === true;
  const isLastStep = index === size - 1;

  return (
    <Card {...tooltipProps} withBorder shadow="md" padding="md" maw={380}>
      <Stack gap="xs">
        {step.title ?
          <Title order={4} size="h5">
            {step.title}
          </Title>
        : null}
        <Text size="sm">{step.content}</Text>
        {showSampleDownload ?
          <Text size="sm" c="dimmed">
            <Trans>
              No spreadsheet handy?{" "}
              <Anchor href={SAMPLE_CSV_HREF} download size="sm">
                Download our sample
              </Anchor>{" "}
              and use that.
            </Trans>
          </Text>
        : null}
        <Group justify="space-between" mt="xs">
          <Button {...closeProps} variant="subtle" color="neutral" size="xs">
            <Trans>Close</Trans>
          </Button>
          <Group gap="xs">
            {index > 0 ?
              <Button {...backProps} variant="default" size="xs">
                <Trans>Back</Trans>
              </Button>
            : null}
            <Button {...primaryProps} size="xs">
              {isLastStep ?
                <Trans>Done</Trans>
              : <Trans>Next</Trans>}
            </Button>
          </Group>
        </Group>
        <Text size="xs" c="dimmed" ta="right">
          {index + 1} / {size}
        </Text>
      </Stack>
    </Card>
  );
}
