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
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AvandarUiProvider } from "@/components/AvandarUiProvider";
import { SeriesAwareVizForm } from "@/components/VisualizationContainer/VizSettingsForm/SeriesAwareVizForm";
import { pathGet } from "$/models/vizs/SettingDescriptor";
import { VizConfigs } from "$/models/vizs/VizConfig/VizConfigs";
import { getMantineSelectDropdown } from "@/test-utils/pickMantineSelectOption";
import type { QueryResultColumn } from "$/models/queries/QueryResult/QueryResult.types";
import type {
  ControlSpec,
  ErasedChartSettingDescriptor,
  ErasedSeriesSettingDescriptor,
} from "$/models/vizs/SettingDescriptor";
import type { AreaChartVizConfig } from "$/models/vizs/AreaChartVizConfig/AreaChartVizConfig.types";
import type { BarChartVizConfig } from "$/models/vizs/BarChartVizConfig/BarChartVizConfig.types";
import type { LineChartVizConfig } from "$/models/vizs/LineChartVizConfig/LineChartVizConfig.types";
import type { RadarChartVizConfig } from "$/models/vizs/RadarChartVizConfig/RadarChartVizConfig.types";

const COLUMNS: readonly QueryResultColumn[] = [
  { name: "category", dataType: "varchar" },
  { name: "value", dataType: "double" },
  { name: "score", dataType: "double" },
];

const barConfig: BarChartVizConfig = {
  vizType: "bar",
  xAxisKey: "category",
  series: [{ renderAs: "bar", key: "value" }],
  layout: "group",
  withLegend: true,
};

const lineConfig: LineChartVizConfig = {
  vizType: "line",
  xAxisKey: "category",
  series: [{ renderAs: "line", key: "value" }],
  withLegend: true,
};

const areaConfig: AreaChartVizConfig = {
  vizType: "area",
  xAxisKey: "category",
  series: [{ renderAs: "area", key: "value" }],
  layout: "default",
  withLegend: true,
};

const radarConfig: RadarChartVizConfig = {
  vizType: "radar",
  nameKey: "category",
  series: [{ key: "value" }],
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

function renderForm<TConfig extends Parameters<typeof SeriesAwareVizForm>[0]["config"]>(
  config: TConfig,
): {
  onConfigChange: ReturnType<typeof vi.fn>;
  rerender: (next: TConfig) => void;
} {
  const onConfigChange = vi.fn();
  const result = render(
    <AvandarUiProvider>
      <SeriesAwareVizForm
        fields={COLUMNS}
        config={config}
        onConfigChange={onConfigChange}
      />
    </AvandarUiProvider>,
  );
  return {
    onConfigChange,
    rerender: (next) => {
      result.rerender(
        <AvandarUiProvider>
          <SeriesAwareVizForm
            fields={COLUMNS}
            config={next}
            onConfigChange={onConfigChange}
          />
        </AvandarUiProvider>,
      );
    },
  };
}

type ConfigsByVizType = {
  bar: BarChartVizConfig;
  line: LineChartVizConfig;
  area: AreaChartVizConfig;
  radar: RadarChartVizConfig;
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

function driveControl(label: string, spec: ControlSpec, nextValue: unknown): void {
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
      const radio = screen.getByRole("radio", { name: exactLabel(target.label) });
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
    const chartDescriptors = VizConfigs.getDescriptors(vizType).chart;

    chartDescriptors.forEach((desc: ErasedChartSettingDescriptor) => {
      it(`changes the "${desc.label}" setting via its ${desc.control.kind} control`, () => {
        const { onConfigChange } = renderForm(config);
        const currentValue = pathGet(config as never, desc.key as never);
        const nextValue = valueForControl(desc.control, currentValue);
        if (nextValue === undefined && desc.control.kind !== "switch") {
          // No other-than-current option to flip to; skip rather than fail.
          return;
        }
        driveControl(desc.label, desc.control, nextValue);
        expect(onConfigChange).toHaveBeenCalled();
        const lastCall: unknown = onConfigChange.mock.lastCall?.[0];
        const actual = pathGet(lastCall as never, desc.key as never);
        const expected =
          desc.control.kind === "switch" ? !(currentValue === true) : nextValue;
        expect(actual).toStrictEqual(expected);
      });
    });
  });

  describe(`SeriesAwareVizForm — ${vizType} series-level descriptors`, () => {
    const config = BASELINE_CONFIGS[vizType];
    const seriesDescriptors = VizConfigs.getDescriptors(vizType).series;

    seriesDescriptors.forEach((desc: ErasedSeriesSettingDescriptor) => {
      it(`changes the "${desc.label}" series setting via its ${desc.control.kind} control`, () => {
        const { onConfigChange } = renderForm(config);
        const firstSeries: unknown = (config as { series: unknown[] }).series[0];
        const currentValue = pathGet(firstSeries as never, desc.key as never);
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
        const actual = pathGet(updatedSeries as never, desc.key as never);
        const expected =
          desc.control.kind === "switch" ? !(currentValue === true) : nextValue;
        expect(actual).toStrictEqual(expected);
      });
    });
  });
});
