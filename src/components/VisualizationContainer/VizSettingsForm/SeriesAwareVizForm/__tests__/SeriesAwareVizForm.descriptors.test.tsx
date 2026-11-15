/**
 * Per-descriptor change-effect tests for `SeriesAwareVizForm`.
 *
 * For each chart-level and series-level descriptor on every
 * series-aware viz (bar / line / area / radar), this suite simulates
 * a change via the descriptor's `ControlSpec` kind and asserts the
 * form fires `onConfigChange` with the setting flipped to a known
 * value. This is the safety net behind the "every setting actually
 * changes the viz" guarantee.
 */
import { getValue } from "@avandar/utils";
import { describe, expect, it, vi } from "vitest";
import { AvaVizConfigs } from "$/models/vizs/AvaVizConfig/AvaVizConfigs";
import { AvandarAppProvider } from "@/components/providers/AvandarAppProvider";
import { SeriesAwareVizForm } from "@/components/VisualizationContainer/VizSettingsForm/SeriesAwareVizForm/SeriesAwareVizForm";
import { fireEvent, render, screen, within } from "@/test-utils";
import { getMantineSelectDropdown } from "@/test-utils/pickMantineSelectOption";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { AvaAreaChartVizConfig } from "$/models/vizs/AvaAreaChartVizConfig/AvaAreaChartVizConfig.types";
import type { AvaBarChartVizConfig } from "$/models/vizs/AvaBarChartVizConfig/AvaBarChartVizConfig.types";
import type { AvaLineChartVizConfig } from "$/models/vizs/AvaLineChartVizConfig/AvaLineChartVizConfig.types";
import type { AvaRadarChartVizConfig } from "$/models/vizs/AvaRadarChartVizConfig/AvaRadarChartVizConfig.types";
import type {
  AnyChartSettingDescriptor,
  AnySeriesSettingDescriptor,
  ControlSpec,
} from "$/models/vizs/VizSettingDescriptors.types";

function readSetting(obj: unknown, key: string): unknown {
  return getValue(obj as never, key as never, { throwError: false });
}

const COLUMNS: readonly QueryResult.ColumnWithId[] = [
  { id: "category" as QueryColumn.Id, name: "category", dataType: "varchar" },
  { id: "value" as QueryColumn.Id, name: "value", dataType: "double" },
  { id: "score" as QueryColumn.Id, name: "score", dataType: "double" },
];

const barConfig: AvaBarChartVizConfig = {
  vizType: "bar",
  xAxisKey: "category" as QueryColumn.Id,
  series: [{ renderAs: "bar", key: "value" as QueryColumn.Id }],
  layout: "group",
  withLegend: true,
};

const lineConfig: AvaLineChartVizConfig = {
  vizType: "line",
  xAxisKey: "category" as QueryColumn.Id,
  series: [{ renderAs: "line", key: "value" as QueryColumn.Id }],
  withLegend: true,
};

const areaConfig: AvaAreaChartVizConfig = {
  vizType: "area",
  xAxisKey: "category" as QueryColumn.Id,
  series: [{ renderAs: "area", key: "value" as QueryColumn.Id }],
  layout: "default",
  withLegend: true,
};

const radarConfig: AvaRadarChartVizConfig = {
  vizType: "radar",
  nameKey: "category" as QueryColumn.Id,
  series: [{ key: "value" as QueryColumn.Id }],
  withLegend: true,
};

const TEST_VALUES: Record<ControlSpec["kind"], unknown> = {
  switch: false,
  color: "#aa00ff",
  segmented: undefined,
  select: undefined,
  number: 3,
  text: "test label",
  columnPicker: "score",
};

function valueForControl(spec: ControlSpec, currentValue: unknown): unknown {
  switch (spec.kind) {
    case "switch":
      return !(currentValue === true);
    case "segmented": {
      const next = spec.options.find((o) => {
        return o.value !== currentValue;
      });
      return next?.value;
    }
    case "select": {
      const next = spec.options.find((o) => {
        return o.value !== currentValue;
      });
      return next?.value;
    }
    default:
      return TEST_VALUES[spec.kind];
  }
}

function renderForm<
  TConfig extends Parameters<typeof SeriesAwareVizForm>[0]["config"],
>(
  config: TConfig,
): {
  onConfigChange: ReturnType<typeof vi.fn>;
  rerender: (next: TConfig) => void;
} {
  const onConfigChange = vi.fn();
  const result = render(
    <AvandarAppProvider>
      <SeriesAwareVizForm
        fields={COLUMNS}
        config={config}
        onConfigChange={onConfigChange}
      />
    </AvandarAppProvider>,
  );
  return {
    onConfigChange,
    rerender: (next) => {
      result.rerender(
        <AvandarAppProvider>
          <SeriesAwareVizForm
            fields={COLUMNS}
            config={next}
            onConfigChange={onConfigChange}
          />
        </AvandarAppProvider>,
      );
    },
  };
}

type ConfigsByVizType = {
  bar: AvaBarChartVizConfig;
  line: AvaLineChartVizConfig;
  area: AvaAreaChartVizConfig;
  radar: AvaRadarChartVizConfig;
};

const BASELINE_CONFIGS: ConfigsByVizType = {
  bar: barConfig,
  line: lineConfig,
  area: areaConfig,
  radar: radarConfig,
};

function exactLabel(label: string): RegExp {
  return new RegExp(`^${label}$`, "i");
}

function driveControl(
  label: string,
  spec: ControlSpec,
  nextValue: unknown,
): void {
  switch (spec.kind) {
    case "switch": {
      const toggle = screen.getByRole("switch", { name: exactLabel(label) });
      fireEvent.click(toggle);
      return;
    }
    case "color": {
      const input = screen.getByLabelText(exactLabel(label));
      fireEvent.change(input, { target: { value: nextValue } });
      return;
    }
    case "number": {
      const input = screen.getByLabelText(exactLabel(label));
      fireEvent.change(input, { target: { value: String(nextValue) } });
      return;
    }
    case "text": {
      const input = screen.getByLabelText(exactLabel(label));
      fireEvent.change(input, { target: { value: nextValue } });
      return;
    }
    case "segmented": {
      const target = spec.options.find((o) => {
        return o.value === nextValue;
      });
      if (target === undefined) {
        throw new Error(`No option for segmented control "${label}"`);
      }
      const radio = screen.getByRole("radio", {
        name: exactLabel(target.label),
      });
      fireEvent.click(radio);
      return;
    }
    case "select": {
      const target = spec.options.find((o) => {
        return o.value === nextValue;
      });
      if (target === undefined) {
        throw new Error(`No option for select control "${label}"`);
      }
      const dropdown = getMantineSelectDropdown(exactLabel(label));
      const option = within(dropdown).getByRole("option", {
        name: target.label,
        hidden: true,
      });
      fireEvent.click(option);
      return;
    }
    case "columnPicker": {
      const dropdown = getMantineSelectDropdown(exactLabel(label));
      const option = within(dropdown).getByRole("option", {
        name: new RegExp(`^${String(nextValue)}$`, "i"),
        hidden: true,
      });
      fireEvent.click(option);
      return;
    }
  }
}

(["bar", "line", "area", "radar"] as const).forEach((vizType) => {
  describe(`SeriesAwareVizForm — ${vizType} chart-level descriptors`, () => {
    const config = BASELINE_CONFIGS[vizType];
    const chartDescriptors = AvaVizConfigs.getDescriptors(vizType).chart;

    chartDescriptors.forEach((desc: AnyChartSettingDescriptor) => {
      it(`changes the "${desc.label}" setting via its ${desc.control.kind} control`, () => {
        const { onConfigChange } = renderForm(config);
        const currentValue = readSetting(config, desc.key);
        const nextValue = valueForControl(desc.control, currentValue);
        if (nextValue === undefined && desc.control.kind !== "switch") {
          // No other-than-current option to flip to; skip rather than fail.
          return;
        }
        driveControl(desc.label, desc.control, nextValue);
        expect(onConfigChange).toHaveBeenCalled();
        const lastCall: unknown = onConfigChange.mock.lastCall?.[0];
        const actual = readSetting(lastCall, desc.key);
        const expected =
          desc.control.kind === "switch" ? !(currentValue === true) : nextValue;
        expect(actual).toStrictEqual(expected);
      });
    });
  });

  describe(`SeriesAwareVizForm — ${vizType} series-level descriptors`, () => {
    const config = BASELINE_CONFIGS[vizType];
    const seriesDescriptors = AvaVizConfigs.getDescriptors(vizType).series;

    seriesDescriptors.forEach((desc: AnySeriesSettingDescriptor) => {
      it(`changes the "${desc.label}" series setting via its ${desc.control.kind} control`, () => {
        const { onConfigChange } = renderForm(config);
        const firstSeries: unknown = (config as { series: unknown[] })
          .series[0];
        const currentValue = readSetting(firstSeries, desc.key);
        const nextValue = valueForControl(desc.control, currentValue);
        if (nextValue === undefined && desc.control.kind !== "switch") {
          return;
        }
        driveControl(desc.label, desc.control, nextValue);
        expect(onConfigChange).toHaveBeenCalled();
        const lastCall = onConfigChange.mock.lastCall?.[0] as {
          series: unknown[];
        };
        const updatedSeries = lastCall.series[0];
        const actual = readSetting(updatedSeries, desc.key);
        const expected =
          desc.control.kind === "switch" ? !(currentValue === true) : nextValue;
        expect(actual).toStrictEqual(expected);
      });
    });
  });
});
