import { definePlugin, useT } from "@avandar/plugin-sdk";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PluginVizRuntime } from "@/lib/plugins/vizs/PluginVizRuntime/PluginVizRuntime";
import { cleanup, render, screen } from "@/test-utils";
import type { PluginCodeModule } from "@/lib/plugins/PluginIndex.types";
import type { PluginVizTransformOutcome } from "@/lib/plugins/vizs/PluginVizRuntime/PluginVizRuntime";
import type {
  PluginVizComponentProps,
  PluginVizContext,
  PluginVizDefinition,
  PluginVizInput,
  PluginVizTransform,
  PluginVizTransformResult,
} from "@avandar/plugin-sdk";
import type { ReactNode } from "react";

const mocks = vi.hoisted(() => {
  return { size: { width: 640, height: 360 } };
});

vi.mock("@mantine/hooks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@mantine/hooks")>();
  return {
    ...actual,
    // The test environment's ResizeObserver never fires, so a real
    // measurement would stay 0 by 0.
    useElementSize: () => {
      return { ref: () => {}, ...mocks.size };
    },
  };
});
vi.mock("@/utils/Logger", () => {
  return { Logger: { error: vi.fn() } };
});

const INPUT: PluginVizInput = {
  rows: [
    { region: "North", cases: 3 },
    { region: "South", cases: 5 },
  ],
  columns: [
    { name: "region", dataType: "varchar" },
    { name: "cases", dataType: "bigint" },
  ],
  settings: { labelColumn: "region" },
  isTruncated: false,
};

const MESSAGES = {
  en: { "series.cases": "Cases", heading: "Cases by region" },
  es: { "series.cases": "Casos", heading: "Casos por región" },
};

const ERROR_FALLBACK_TEXT = "Case dots couldn't render";

function _makeCaseBarsFromRows(
  input: PluginVizInput,
  context: PluginVizContext,
): PluginVizTransformResult {
  return {
    rows: input.rows.map((row) => {
      return { region: row.region, cases: row.cases, locale: context.locale };
    }),
    chart: {
      kind: "bar",
      xColumn: "region",
      series: [{ column: "cases", label: context.i18n.t("series.cases") }],
    },
  };
}

function CaseDots({ width, height, rows }: PluginVizComponentProps): ReactNode {
  const t = useT();
  return (
    <div
      data-testid="case-dots"
      data-size={`${width}x${height}`}
      data-row-count={rows.length}
    >
      {t("heading")}
    </div>
  );
}

function CrashingChart(): ReactNode {
  throw new Error("chart crashed");
}

function _runTransform(options: {
  definition: PluginVizDefinition;
  locale?: string;
}): PluginVizTransformOutcome {
  return PluginVizRuntime.runPluginVizTransform({
    definition: options.definition,
    vizId: "case-bars",
    input: INPUT,
    messages: MESSAGES,
    locale: options.locale ?? "en",
  });
}

function _runTransformFunction(
  transform: PluginVizTransform,
): PluginVizTransformOutcome {
  return _runTransform({ definition: { transform } });
}

function _getDefinition(
  codeModule: PluginCodeModule,
  vizId: string = "case-bars",
): PluginVizDefinition | undefined {
  return PluginVizRuntime.getPluginVizDefinitionFromCodeModule({
    codeModule,
    vizId,
  });
}

function _renderComponentView(options: {
  definition: PluginVizDefinition;
  locale?: string;
}): void {
  const { PluginVizComponentView } = PluginVizRuntime;
  render(
    <PluginVizComponentView
      definition={options.definition}
      vizId="case-dots"
      input={INPUT}
      messages={MESSAGES}
      locale={options.locale ?? "en"}
      pluginName="Case charts"
      errorFallback={<p>{ERROR_FALLBACK_TEXT}</p>}
    />,
  );
}

describe("PluginVizRuntime.runPluginVizTransform", () => {
  it("returns a bar config built from the transform's chart spec", () => {
    expect(_runTransformFunction(_makeCaseBarsFromRows)).toMatchObject({
      status: "ok",
      uiVizConfig: {
        vizType: "bar",
        xAxisKey: "region",
        series: [{ renderAs: "bar", key: "cases", label: "Cases" }],
      },
    });
  });

  it("returns the transform's rows to draw", () => {
    expect(_runTransformFunction(_makeCaseBarsFromRows)).toMatchObject({
      rows: [
        { region: "North", cases: 3 },
        { region: "South", cases: 5 },
      ],
    });
  });

  it("gives the transform a translator for the requested locale", () => {
    expect(
      _runTransform({
        definition: { transform: _makeCaseBarsFromRows },
        locale: "es",
      }),
    ).toMatchObject({ uiVizConfig: { series: [{ label: "Casos" }] } });
  });

  it("gives the transform the requested locale", () => {
    expect(
      _runTransform({
        definition: { transform: _makeCaseBarsFromRows },
        locale: "es",
      }),
    ).toMatchObject({ rows: [{ locale: "es" }, { locale: "es" }] });
  });

  it("reports failed with the error a transform throws", () => {
    const thrownError = new Error("boom");

    expect(
      _runTransformFunction(() => {
        throw thrownError;
      }),
    ).toEqual({ status: "failed", error: thrownError });
  });

  it("reports failed when the transform returns a spec with no series", () => {
    expect(
      _runTransformFunction((input) => {
        return {
          rows: input.rows,
          chart: { kind: "bar", xColumn: "region", series: [] },
        };
      }).status,
    ).toBe("failed");
  });

  it("reports failed when the chart spec names a column the rows lack", () => {
    expect(
      _runTransformFunction((input) => {
        return {
          rows: input.rows,
          chart: {
            kind: "bar",
            xColumn: "district",
            series: [{ column: "cases" }],
          },
        };
      }).status,
    ).toBe("failed");
  });

  it("reports failed when reading the transform throws", () => {
    const thrownError = new Error("hostile getter");
    const definition: PluginVizDefinition = {
      get transform(): never {
        throw thrownError;
      },
    };

    expect(_runTransform({ definition })).toEqual({
      status: "failed",
      error: thrownError,
    });
  });

  it("draws the same rows it checked when the rows change on each read", () => {
    const checkedRows = [{ region: "North", cases: 3 }];
    let rowsReadCount = 0;

    const outcome = _runTransformFunction(() => {
      return {
        get rows() {
          rowsReadCount += 1;
          return rowsReadCount === 1 ? checkedRows : [{ other: 1 }];
        },
        chart: {
          kind: "bar",
          xColumn: "region",
          series: [{ column: "cases" }],
        },
      };
    });

    expect(outcome).toMatchObject({ status: "ok", rows: checkedRows });
  });

  it("reports failed for a chart that has no transform", () => {
    expect(_runTransform({ definition: { Component: CaseDots } }).status).toBe(
      "failed",
    );
  });
});

describe("PluginVizRuntime.getPluginVizDefinitionFromCodeModule", () => {
  const CODE_MODULE: PluginCodeModule = {
    definition: definePlugin({
      vizTypes: { "case-bars": { transform: _makeCaseBarsFromRows } },
    }),
    messages: MESSAGES,
  };

  it("returns the chart definition the code module declares for the id", () => {
    expect(_getDefinition(CODE_MODULE)).toEqual({
      transform: _makeCaseBarsFromRows,
    });
  });

  it("returns undefined for an id the code module does not declare", () => {
    expect(_getDefinition(CODE_MODULE, "case-pies")).toBeUndefined();
  });

  it("returns undefined for an id inherited from Object", () => {
    expect(_getDefinition(CODE_MODULE, "constructor")).toBeUndefined();
  });

  it("returns undefined when the module exports no plugin definition", () => {
    expect(
      _getDefinition({
        definition: { vizTypes: { "case-bars": {} } },
        messages: MESSAGES,
      }),
    ).toBeUndefined();
  });

  it("returns undefined when reading the chart definitions throws", () => {
    expect(
      _getDefinition({
        definition: {
          kind: "avandar-plugin",
          commands: {},
          get vizTypes(): never {
            throw new Error("hostile getter");
          },
        },
        messages: MESSAGES,
      }),
    ).toBeUndefined();
  });

  it("returns undefined for a chart entry with neither a transform nor a component", () => {
    expect(
      _getDefinition({
        definition: {
          kind: "avandar-plugin",
          commands: {},
          vizTypes: { "case-bars": { transform: "nope" } },
        },
        messages: MESSAGES,
      }),
    ).toBeUndefined();
  });
});

describe("PluginVizRuntime.PluginVizComponentView", () => {
  afterEach(() => {
    cleanup();
    mocks.size = { width: 640, height: 360 };
    vi.restoreAllMocks();
  });

  it("draws the chart component at the measured size", () => {
    _renderComponentView({ definition: { Component: CaseDots } });

    expect(screen.getByTestId("case-dots")).toHaveAttribute(
      "data-size",
      "640x360",
    );
  });

  it("draws nothing while the chart area has no size", () => {
    mocks.size = { width: 0, height: 0 };

    _renderComponentView({ definition: { Component: CaseDots } });

    expect(screen.queryByTestId("case-dots")).toBeNull();
  });

  it("gives the chart component the plugin's strings through useT", () => {
    _renderComponentView({ definition: { Component: CaseDots }, locale: "es" });

    expect(screen.getByText("Casos por región")).toBeInTheDocument();
  });

  it("shows the error fallback when the chart component throws", () => {
    // React and the boundary both log the crash. Keep the test output clean.
    vi.spyOn(console, "error").mockImplementation(() => {});

    _renderComponentView({ definition: { Component: CrashingChart } });

    expect(screen.getByText(ERROR_FALLBACK_TEXT)).toBeInTheDocument();
  });

  it("shows the error fallback when reading the chart component throws", () => {
    _renderComponentView({
      definition: {
        get Component(): never {
          throw new Error("hostile getter");
        },
      },
    });

    expect(screen.getByText(ERROR_FALLBACK_TEXT)).toBeInTheDocument();
  });

  it("shows the error fallback for a chart that has no component", () => {
    _renderComponentView({
      definition: { transform: _makeCaseBarsFromRows },
    });

    expect(screen.getByText(ERROR_FALLBACK_TEXT)).toBeInTheDocument();
  });
});
