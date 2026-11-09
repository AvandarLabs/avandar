import { isNumber } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import {
  Button,
  Group,
  NumberInput,
  Select,
  Stack,
  Switch,
} from "@mantine/core";
import { BUFFER_DISTANCE_UNITS } from "$/models/AvaMap/MapLayer/MapLayer";
import { getBufferDistanceLimitsFromUnit } from "@/views/GisApp/layers/bufferDistanceLimits/bufferDistanceLimits";
import { BUFFER_DISTANCE_UNIT_LABELS } from "@/views/GisApp/layers/BufferDistanceUnit.constants";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { BufferLabelColumnOption } from "@/views/GisApp/shell/MapToolCluster/BufferMapTool/BufferMapTool.types";
import type { ReactNode } from "react";

type Props = {
  distance: number;
  distanceUnit: MapLayer.BufferDistanceUnit;
  dissolve: boolean;
  labelColumn: QueryColumn.Id | undefined;
  labelColumnOptions: readonly BufferLabelColumnOption[];
  onDistanceChange: (distance: number) => void;
  onDistanceUnitChange: (distanceUnit: MapLayer.BufferDistanceUnit) => void;
  onDissolveChange: (dissolve: boolean) => void;
  onLabelColumnChange: (labelColumn: QueryColumn.Id | undefined) => void;
  onConfirm: () => void;
};

type DistanceFieldsProps = Pick<
  Props,
  "distance" | "distanceUnit" | "onDistanceChange" | "onDistanceUnitChange"
>;

/**
 * The distance number and its unit, side by side. The number is held within
 * the buffer limits restated in the chosen unit.
 */
function BufferDistanceFields({
  distance,
  distanceUnit,
  onDistanceChange,
  onDistanceUnitChange,
}: DistanceFieldsProps): ReactNode {
  const { i18n, t } = useLingui();
  const { minDistance, maxDistance } =
    getBufferDistanceLimitsFromUnit(distanceUnit);
  const unitLabel = i18n._(BUFFER_DISTANCE_UNIT_LABELS[distanceUnit]);
  return (
    <Group gap="xs" wrap="nowrap" align="flex-start">
      <NumberInput
        label={t`Distance`}
        description={t`At least ${minDistance} ${unitLabel}`}
        value={distance}
        min={minDistance}
        max={maxDistance}
        clampBehavior="blur"
        allowNegative={false}
        decimalScale={2}
        onChange={(value) => {
          if (isNumber(value)) {
            onDistanceChange(value);
          }
        }}
      />
      <Select<MapLayer.BufferDistanceUnit>
        label={t`Unit`}
        // Kept inside the popover: an option in a portal counts as a press
        // outside it and would close the popover mid-pick.
        comboboxProps={{ withinPortal: false }}
        w={88}
        allowDeselect={false}
        value={distanceUnit}
        data={BUFFER_DISTANCE_UNITS.map((unit) => {
          return {
            value: unit,
            label: i18n._(BUFFER_DISTANCE_UNIT_LABELS[unit]),
          };
        })}
        onChange={(unit) => {
          if (unit) {
            onDistanceUnitChange(unit);
          }
        }}
      />
    </Group>
  );
}

/**
 * Distance, unit, dissolve, ring label, and confirm controls for inserting a
 * buffer layer. Rendered by `BufferMapToolPopover`.
 */
export function BufferMapToolForm({
  dissolve,
  labelColumn,
  labelColumnOptions,
  onDissolveChange,
  onLabelColumnChange,
  onConfirm,
  ...distanceFieldsProps
}: Props): ReactNode {
  const { t } = useLingui();
  return (
    <Stack gap="xs">
      <BufferDistanceFields {...distanceFieldsProps} />
      <Switch
        label={t`Dissolve`}
        checked={dissolve}
        onChange={(event) => {
          onDissolveChange(event.currentTarget.checked);
        }}
      />
      {labelColumnOptions.length > 0 ? (
        <Select<QueryColumn.Id>
          label={t`Label each ring with`}
          // Kept inside the popover: an option in a portal counts as a press
          // outside it and would close the popover mid-pick.
          comboboxProps={{ withinPortal: false }}
          placeholder={t`No label`}
          clearable
          disabled={dissolve}
          data={[...labelColumnOptions]}
          value={labelColumn ?? null}
          onChange={(value) => {
            onLabelColumnChange(value ?? undefined);
          }}
        />
      ) : null}
      <Button size="compact-sm" onClick={onConfirm}>
        {t`Confirm`}
      </Button>
    </Stack>
  );
}
