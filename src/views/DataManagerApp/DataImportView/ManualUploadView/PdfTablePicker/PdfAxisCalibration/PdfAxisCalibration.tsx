import { Trans, useLingui } from "@lingui/react/macro";
import { Button, NumberInput, Stack, Text } from "@mantine/core";
import { useState } from "react";
import type { AxisTick } from "@/workers/pdfSniff/calibrateAxis/calibrateAxis";
import type { ReactNode } from "react";

type PdfPoint = { x: number; y: number };

type Props = {
  /** True while the overlay is collecting axis clicks for this region. */
  isPicking: boolean;
  points: readonly PdfPoint[];
  onStart: () => void;
  onApply: (hints: readonly AxisTick[]) => void;
  onCancel: () => void;
};

function _toNumber(value: string | number): number | undefined {
  if (value === "") {
    return undefined;
  }
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function _hintsFrom(
  points: readonly PdfPoint[],
  firstValue: string | number,
  secondValue: string | number,
): readonly AxisTick[] | undefined {
  const first = _toNumber(firstValue);
  const second = _toNumber(secondValue);
  if (points.length < 2 || first === undefined || second === undefined) {
    return undefined;
  }
  return [
    { position: points[0]!.y, value: first },
    { position: points[1]!.y, value: second },
  ];
}

/**
 * Two-point y-axis calibration: click ticks on the page, type their values.
 */
export function PdfAxisCalibration({
  isPicking,
  points,
  onStart,
  onApply,
  onCancel,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const [firstValue, setFirstValue] = useState<string | number>("");
  const [secondValue, setSecondValue] = useState<string | number>("");
  const hints = _hintsFrom(points, firstValue, secondValue);

  const stopCardSelect = (event: { stopPropagation: () => void }): void => {
    event.stopPropagation();
  };

  return (
    <Stack gap={4} onClick={stopCardSelect} onKeyDown={stopCardSelect}>
      {!isPicking ?
        <Button size="xs" variant="light" onClick={onStart}>
          <Trans>Calibrate manually</Trans>
        </Button>
      : null}
      {isPicking && points.length === 0 ?
        <Text size="xs" c="dimmed">
          {t`Click a labelled tick on the y-axis.`}
        </Text>
      : null}
      {isPicking && points.length === 1 ?
        <Text size="xs" c="dimmed">
          {t`Click a second labelled tick on the y-axis.`}
        </Text>
      : null}
      {isPicking && points.length >= 2 ?
        <>
          <NumberInput
            size="xs"
            label={t`First tick value`}
            value={firstValue}
            onChange={setFirstValue}
          />
          <NumberInput
            size="xs"
            label={t`Second tick value`}
            value={secondValue}
            onChange={setSecondValue}
          />
          <Button
            size="xs"
            disabled={hints === undefined}
            onClick={() => {
              if (hints !== undefined) {
                onApply(hints);
              }
            }}
          >
            <Trans>Apply calibration</Trans>
          </Button>
        </>
      : null}
      {isPicking ?
        <Button size="xs" variant="subtle" onClick={onCancel}>
          <Trans>Cancel</Trans>
        </Button>
      : null}
    </Stack>
  );
}
