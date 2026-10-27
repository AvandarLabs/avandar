import { VizConfigs } from "$/models/vizs/VizConfig/VizConfigs";
import { DataVizFilters } from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/DataVizFilters/DataVizFilters";
import { synchronizeLegacyVizType } from "./synchronizeLegacyVizType";
import type { VizConfig } from "$/models/vizs/VizConfig/VizConfig";
import type { Props as DataVizPBlockProps } from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/DataVizPBlock";
import type { ResolveDataTrigger } from "@puckeditor/core";

/**
 * The last config the user saw for each viz type, per DataViz block.
 *
 * Keyed by block id first because Puck registers one `ComponentConfig` per
 * component *type*, so a single `resolveData` closure serves every DataViz
 * block on the page. Without the outer key, two blocks would overwrite each
 * other's memory, which looks correct until a dashboard holds more than one
 * chart.
 *
 * Bound entries use `Partial<VizConfig.Registry>`, so each entry's config is
 * correlated with the viz type it is filed under: a bar config cannot be
 * stored under `"pie"`. Legacy name-based configs have their own memory.
 */
export type DataVizConfigMemory = Record<
  string,
  Partial<VizConfig.Registry> & {
    legacy?: Partial<Record<VizConfig.Type, VizConfig.OutputNameKeyed>>;
  }
>;

type ChangedFlags = Partial<Record<keyof DataVizPBlockProps, boolean>>;

const DEFAULT_VIZ_TYPE = "table" as const;

const DEFAULT_NL_QUERY: DataVizPBlockProps["nlQuery"] = {
  prompt: "",
  rawSql: "",
  generations: [],
};

/**
 * Creates synchronized DataViz block props and type-specific config memory
 * from the current props. Returns defaults for incomplete saved blocks and
 * restores remembered settings when the visualization type changes.
 */
export function makeDataVizPBlockStateFromProps(options: {
  props: Partial<DataVizPBlockProps>;
  changed: ChangedFlags;
  trigger?: ResolveDataTrigger;
  /** Identifies the Puck block whose config memory is being updated. */
  blockId: string;
  vizConfigMemory: DataVizConfigMemory;
}): { props: DataVizPBlockProps; vizConfigMemory: DataVizConfigMemory } {
  const { props, changed, trigger, blockId, vizConfigMemory } = options;
  // Puck's load pass marks every field `changed` because its resolver cache
  // is empty. Rewriting here would look like an unsaved edit, and seeding
  // memory from it would record a switch the user never made. Missing filter
  // defaults are filled at render time instead.
  if (trigger === "load") {
    return { props: props as DataVizPBlockProps, vizConfigMemory };
  }

  if (props.columnBindingVersion === 0) {
    return synchronizeLegacyVizType({
      props,
      changed,
      blockId,
      vizConfigMemory,
    });
  }
  const columnIdProps = props as Partial<
    Extract<DataVizPBlockProps, { columnBindingVersion: 1 }>
  >;
  const nextProps: Extract<DataVizPBlockProps, { columnBindingVersion: 1 }> = {
    columnBindingVersion: 1,
    columnBindings: columnIdProps.columnBindings ?? {
      version: 1,
      scopeKey: blockId,
      sqlKey: "",
      columns: [],
    },
    globalFilterTargets: columnIdProps.globalFilterTargets ?? {},
    nlQuery: columnIdProps.nlQuery ?? DEFAULT_NL_QUERY,
    vizType: columnIdProps.vizType ?? DEFAULT_VIZ_TYPE,
    vizConfig:
      columnIdProps.vizConfig ??
      VizConfigs.makeEmptyConfig(columnIdProps.vizType ?? DEFAULT_VIZ_TYPE),
    globalFilterSubscription:
      columnIdProps.globalFilterSubscription ??
      DataVizFilters.defaultGlobalFilterSubscription,
    localFilters: columnIdProps.localFilters ?? [],
  };

  if (changed.vizType && nextProps.vizConfig.vizType !== nextProps.vizType) {
    const outgoingVizConfig = nextProps.vizConfig;
    const blockVizConfigMemory = vizConfigMemory[blockId] ?? {};
    const rememberedVizConfig = blockVizConfigMemory[nextProps.vizType];

    // A remembered config can name columns the current query no longer
    // returns. `DataVizPBlock` runs `applyVizConfigFromQueryResult` on every
    // render, so it is reconciled there rather than here, where the result
    // columns are not available.
    nextProps.vizConfig =
      rememberedVizConfig ??
      VizConfigs.convertVizConfig(outgoingVizConfig, nextProps.vizType);

    // TypeScript widens the computed union key to `string` and so cannot see
    // that the outgoing config lands under its own `vizType`. The key is taken
    // from the value itself, so the correlation holds by construction.
    const nextBlockVizConfigMemory = {
      ...blockVizConfigMemory,
      [outgoingVizConfig.vizType]: outgoingVizConfig,
    } as Partial<VizConfig.Registry>;

    return {
      props: nextProps,
      vizConfigMemory: {
        ...vizConfigMemory,
        [blockId]: nextBlockVizConfigMemory,
      },
    };
  }

  if (changed.vizConfig && nextProps.vizConfig.vizType !== nextProps.vizType) {
    nextProps.vizType = nextProps.vizConfig.vizType;
  }

  return { props: nextProps, vizConfigMemory };
}
