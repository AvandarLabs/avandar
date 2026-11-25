import { useT } from "@avandar/plugin-sdk";
import {
  Group,
  SegmentedControl,
  Stack,
  Switch,
  Text,
} from "@avandar/plugin-ui";
import { useId } from "react";
import type { EpicurveInterval } from "../../epicurve/getBucketStartFromDate/getBucketStartFromDate";
import type { ReactNode } from "react";

type Props = {
  interval: EpicurveInterval;
  onIntervalChange: (interval: EpicurveInterval) => void;
  isStackedByDistrict: boolean;

  /** False when no case has a district, which disables stacking. */
  canStackByDistrict: boolean;
  onIsStackedByDistrictChange: (isStackedByDistrict: boolean) => void;
};

/** The intervals the user can bucket cases by, shortest first. */
const INTERVALS: readonly EpicurveInterval[] = ["day", "epiWeek", "month"];

/**
 * The case epicurve's interval picker and its "Stack by district" switch,
 * which is disabled, with the reason, while no case has a district.
 * `CaseEpicurveView` owns both values.
 */
export function CaseEpicurveControls(props: Readonly<Props>): ReactNode {
  const t = useT();
  const intervalLabelId = useId();
  const noDistrictHintId = useId();
  return (
    <Group align="flex-start" justify="space-between">
      <Stack gap="xs">
        <Text id={intervalLabelId} size="sm" fw={500}>
          {t("viz.epicurve.interval")}
        </Text>
        <SegmentedControl
          aria-labelledby={intervalLabelId}
          value={props.interval}
          data={INTERVALS.map((interval) => {
            return {
              value: interval,
              label: t(`viz.epicurve.interval.${interval}`),
            };
          })}
          onChange={(value) => {
            const pickedInterval = INTERVALS.find((interval) => {
              return interval === value;
            });
            if (pickedInterval !== undefined) {
              props.onIntervalChange(pickedInterval);
            }
          }}
        />
      </Stack>
      <Stack gap={4}>
        <Switch
          label={t("caseEpicurve.stackByDistrict")}
          aria-describedby={
            props.canStackByDistrict ? undefined : noDistrictHintId
          }
          checked={props.isStackedByDistrict}
          disabled={!props.canStackByDistrict}
          onChange={(event) => {
            props.onIsStackedByDistrictChange(event.currentTarget.checked);
          }}
        />
        {props.canStackByDistrict ? null : (
          <Text id={noDistrictHintId} size="xs" c="dimmed">
            {t("caseEpicurve.noDistrict")}
          </Text>
        )}
      </Stack>
    </Group>
  );
}
