// VizSettingsForm/BarChartForm.tsx
import { useMemo } from "react";
import { QueryResultField } from "@/clients/LocalDatasetQueryClient";
import { UnknownDataFrame } from "@/lib/types/common";
import { CHART_REQUIREMENTS } from "@/lib/ui/data-viz/requirements/chartRequirements";
import { useXYFieldGuards } from "@/lib/ui/data-viz/requirements/useXYFieldGuards";
import { Select } from "@/lib/ui/inputs/Select";
import { makeSelectOptions } from "@/lib/ui/inputs/Select/makeSelectOptions";
import { getProp } from "@/lib/utils/objects/higherOrderFuncs";

export type BarChartSettings = {
  xAxisKey: string | undefined;
  yAxisKey: string | undefined;
};

type Props = {
  fields: readonly QueryResultField[];
  data: UnknownDataFrame; // ← added in Step 3 already
  settings: BarChartSettings;
  onSettingsChange: (settings: BarChartSettings) => void;
};

export function BarChartForm({
  fields,
  data,
  settings,
  onSettingsChange,
}: Props): JSX.Element {
  const {
    allowedXAxisNames,
    allowedYAxisNames,
    isXAxisDisabled,
    isYAxisDisabled,
    xAxisPlaceholder,
    yAxisPlaceholder,
  } = useXYFieldGuards({
    fields,
    data,
    requirements: CHART_REQUIREMENTS.bar,
  });

  const xAxisOptions = useMemo(() => {
    return makeSelectOptions(
      fields.filter((f) => {
        return allowedXAxisNames.includes(f.name);
      }),
      { valueFn: getProp("name"), labelFn: getProp("name") },
    );
  }, [fields, allowedXAxisNames]);

  const yAxisOptions = useMemo(() => {
    return makeSelectOptions(
      fields.filter((f) => {
        return allowedYAxisNames.includes(f.name);
      }),
      { valueFn: getProp("name"), labelFn: getProp("name") },
    );
  }, [fields, allowedYAxisNames]);

  return (
    <>
      <Select
        key={`x-${allowedXAxisNames.join("|")}`}
        allowDeselect
        data={xAxisOptions}
        label="X Axis"
        value={settings.xAxisKey ?? null}
        disabled={isXAxisDisabled}
        placeholder={xAxisPlaceholder}
        onChange={(selectedName) => {
          const updatedSettings: BarChartSettings = {
            ...settings,
            xAxisKey: selectedName ?? undefined,
          };
          onSettingsChange(updatedSettings);
        }}
      />

      <Select
        key={`y-${allowedYAxisNames.join("|")}`}
        allowDeselect
        data={yAxisOptions}
        label="Y Axis"
        value={settings.yAxisKey}
        disabled={isYAxisDisabled}
        placeholder={yAxisPlaceholder ?? null}
        onChange={(selectedName) => {
          const updatedSettings: BarChartSettings = {
            ...settings,
            yAxisKey: selectedName ?? undefined,
          };
          onSettingsChange(updatedSettings);
        }}
      />
    </>
  );
}
