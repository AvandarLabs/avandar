import type { ReactNode } from "react";

import { isNumber } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { Button, NumberInput, Stack, Switch } from "@mantine/core";

type Props = {
  distanceMeters: number;
  dissolve: boolean;
  onDistanceMetersChange: (distanceMeters: number) => void;
  onDissolveChange: (dissolve: boolean) => void;
  onConfirm: () => void;
};

/** Distance, dissolve, and confirm controls for inserting a buffer layer. */
export function BufferMapToolForm({
  distanceMeters,
  dissolve,
  onDistanceMetersChange,
  onDissolveChange,
  onConfirm,
}: Props): ReactNode {
  const { t } = useLingui();
  return (
    <Stack gap="xs">
      <NumberInput
        label={t`Distance (meters)`}
        value={distanceMeters}
        min={100}
        max={1_000_000}
        clampBehavior="blur"
        allowDecimal={false}
        onChange={(value) => {
          if (isNumber(value)) {
            onDistanceMetersChange(value);
          }
        }}
      />
      <Switch
        label={t`Dissolve`}
        checked={dissolve}
        onChange={(event) => {
          onDissolveChange(event.currentTarget.checked);
        }}
      />
      <Button size="compact-sm" onClick={onConfirm}>
        {t`Confirm`}
      </Button>
    </Stack>
  );
}
