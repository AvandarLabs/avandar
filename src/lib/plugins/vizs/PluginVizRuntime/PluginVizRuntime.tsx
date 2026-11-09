import { isPluginDefinition, makePluginTranslator } from "@avandar/plugin-sdk";
import { isPlainObject } from "@avandar/utils";
import { makeUiVizConfigFromPluginChartSpec } from "@/lib/plugins/vizs/makeUiVizConfigFromPluginChartSpec/makeUiVizConfigFromPluginChartSpec";
import { PluginChartSpecSchema } from "@/lib/plugins/vizs/PluginChartSpecSchema/PluginChartSpecSchema";
import { PluginVizComponentView } from "@/lib/plugins/vizs/PluginVizRuntime/PluginVizComponentView";
import type { BuiltInUiVizConfig } from "$/models/vizs/UiVizConfig/UiVizConfig.types";
import type { PluginCodeModule } from "@/lib/plugins/PluginIndex.types";
import type {
  PluginMessages,
  PluginVizDefinition,
  PluginVizInput,
} from "@avandar/plugin-sdk";
import type { UnknownDataFrame } from "@avandar/utils";

/**
 * What running a plugin chart's transform produced. `ok` carries the
 * built-in chart config, its column metadata, and the rows to draw.
 * `failed` carries what went wrong: the transform threw, returned rows that
 * are not an array of plain objects, returned an invalid chart spec, or
 * named a column its rows lack.
 */
export type PluginVizTransformOutcome =
  | Readonly<{
      status: "ok";
      uiVizConfig: BuiltInUiVizConfig;
      columnNames: readonly string[];
      dateColumns: ReadonlySet<string>;
      rows: UnknownDataFrame;
    }>
  | Readonly<{ status: "failed"; error: unknown }>;

/**
 * What the plugin chart runtime runs a chart on: the chart's definition from
 * the plugin's code, its manifest id, the input built from the query result,
 * the plugin's messages, and the locale to translate them in. The renderer
 * passes it to `runPluginVizTransform`, and spreads it into
 * `PluginVizComponentView`'s props.
 */
export type PluginVizRunOptions = {
  definition: PluginVizDefinition;
  vizId: string;
  input: PluginVizInput;
  messages: PluginMessages;
  locale: string;
};

function _isPluginVizDefinition(value: unknown): value is PluginVizDefinition {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const hasTransform =
    "transform" in value && typeof value.transform === "function";
  const hasComponent =
    "Component" in value &&
    (typeof value.Component === "function" ||
      (typeof value.Component === "object" && value.Component !== null));
  return hasTransform || hasComponent;
}

function _getPluginVizDefinitionFromCodeModule(options: {
  codeModule: PluginCodeModule;
  vizId: string;
}): PluginVizDefinition | undefined {
  const { codeModule, vizId } = options;
  const { definition } = codeModule;
  // Plugin code is untrusted, so reading its chart definitions can throw.
  try {
    if (
      !isPluginDefinition(definition) ||
      !Object.hasOwn(definition.vizTypes, vizId)
    ) {
      return undefined;
    }
    const vizDefinition: unknown = definition.vizTypes[vizId];
    return _isPluginVizDefinition(vizDefinition) ? vizDefinition : undefined;
  } catch {
    return undefined;
  }
}

function _assertRowsArePlainObjects(rows: unknown): void {
  const areRowsPlainObjects =
    Array.isArray(rows) &&
    rows.every((row) => {
      return isPlainObject(row);
    });
  if (!areRowsPlainObjects) {
    throw new Error("The transform's rows must be an array of plain objects.");
  }
}

function _runPluginVizTransform(
  options: Readonly<PluginVizRunOptions>,
): PluginVizTransformOutcome {
  const { definition, vizId, input, messages, locale } = options;
  // Plugin code is untrusted, so every read of the definition and of what the
  // transform returns runs inside the try. The rows are read once, so the
  // rows that pass the column check are the rows that get drawn.
  try {
    const { transform } = definition;
    if (transform === undefined) {
      throw new Error(`The "${vizId}" chart has no transform.`);
    }
    const result = transform(input, {
      i18n: { t: makePluginTranslator({ locale, messages }) },
      locale,
    });
    const { rows } = result;
    _assertRowsArePlainObjects(rows);
    const chart = PluginChartSpecSchema.parse(result.chart);
    return {
      status: "ok",
      ...makeUiVizConfigFromPluginChartSpec({ chart, rows }),
      rows: [...rows],
    };
  } catch (error) {
    return { status: "failed", error };
  }
}

/**
 * Everything that runs plugin chart code, in one module. It pulls in the
 * plugin SDK runtime and Lingui's message compiler, so load it only through
 * `loadPluginVizRuntime` when a plugin chart draws. The plugin bundle check
 * leaves chunks only this module reaches out of the plugin host's budget.
 */
export const PluginVizRuntime = {
  /**
   * Gets the chart definition a plugin's code module declares under the
   * manifest's chart type id. Returns undefined when the module is not a
   * plugin definition, declares no such chart (inherited keys such as
   * `constructor` do not count), declares something that is neither a
   * transform nor a component, or throws while being read.
   */
  getPluginVizDefinitionFromCodeModule: _getPluginVizDefinitionFromCodeModule,

  /**
   * Runs a transform chart's transform with a translator for the plugin's
   * messages, checks the spec it returns, and converts it to a built-in
   * chart config. Never throws: every failure comes back as `failed`.
   */
  runPluginVizTransform: _runPluginVizTransform,

  /** Draws a component chart. See `PluginVizComponentView`. */
  PluginVizComponentView,
};
