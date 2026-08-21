import { VizConfigs } from "$/models/vizs/VizConfig/VizConfigs";
import { DataVizFilters } from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/DataVizFilters/DataVizFilters";
import type { Props as DataVizPBlockProps } from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/DataVizPBlock";
import type { ResolveDataTrigger } from "@puckeditor/core";
import type {
  VizConfig,
  VizType,
} from "$/models/vizs/VizConfig/VizConfig.types";

/**
 * The last config the user saw for each viz type, per DataViz block.
 *
 * Keyed by block id first because Puck registers one `ComponentConfig` per
 * component *type*, so a single `resolveData` closure serves every DataViz
 * block on the page. Without the outer key, two blocks would overwrite each
 * other's memory, which looks correct until a dashboard holds more than one
 * chart.
 */
export type DataVizConfigMemory = Record<
  string,
  Partial<Record<VizType, VizConfig>>
>;

type ChangedFlags = Partial<Record<keyof DataVizPBlockProps, boolean>>;

const DEFAULT_VIZ_TYPE = "table" as const;

const DEFAULT_NL_QUERY: DataVizPBlockProps["nlQuery"] = {
  prompt: "",
  rawSql: "",
  generations: [],
};

/**
 * Pure data-rewrite used by the DataViz block's Puck `resolveData` hook.
 *
 * Keeps `vizType` and `vizConfig.vizType` in sync whenever the user picks a
 * different type from the top-level select: the outgoing config is
 * remembered under its own viz type, and the incoming one is restored from
 * memory when the user has been there before, falling back to
 * `VizConfigs.convertVizConfig` when they have not. Restoring is what makes
 * a bar -> pie -> bar round trip keep styling that a pie config cannot hold.
 *
 * Stays pure: the memory is passed in and the updated memory is returned,
 * so the mutable holder lives in the hook and this function remains
 * directly testable. Also fills in defaults for missing fields so older
 * saved blocks or freshly created ones always resolve to a fully-shaped
 * `DataVizPBlockProps`.
 */
export function resolveDataVizPBlockProps(input: {
  props: Partial<DataVizPBlockProps>;
  changed: ChangedFlags;
  trigger?: ResolveDataTrigger;
  /** Puck's per-instance id, threaded in because the props type omits it. */
  blockId: string;
  vizConfigMemory: DataVizConfigMemory;
}): { props: DataVizPBlockProps; vizConfigMemory: DataVizConfigMemory } {
  const { props, changed, trigger, blockId, vizConfigMemory } = input;
  // Puck's load pass marks every field `changed` because its resolver cache
  // is empty. Rewriting here would look like an unsaved edit, and seeding
  // memory from it would record a switch the user never made. Missing filter
  // defaults are filled at render time instead.
  if (trigger === "load") {
    return { props: props as DataVizPBlockProps, vizConfigMemory };
  }

  const nextProps: DataVizPBlockProps = {
    nlQuery: props.nlQuery ?? DEFAULT_NL_QUERY,
    vizType: props.vizType ?? DEFAULT_VIZ_TYPE,
    vizConfig:
      props.vizConfig ??
      VizConfigs.makeEmptyConfig(props.vizType ?? DEFAULT_VIZ_TYPE),
    globalFilterSubscription:
      props.globalFilterSubscription ??
      DataVizFilters.defaultGlobalFilterSubscription,
    localFilters: props.localFilters ?? [],
  };

  if (changed.vizType && nextProps.vizConfig.vizType !== nextProps.vizType) {
    const outgoing = nextProps.vizConfig;
    const blockMemory = vizConfigMemory[blockId] ?? {};
    const remembered = blockMemory[nextProps.vizType];

    // A remembered config can name columns the current query no longer
    // returns. `DataVizPBlock` runs `applyVizConfigFromQueryResult` on every
    // render, so it is reconciled there rather than here, where the result
    // columns are not available.
    nextProps.vizConfig =
      remembered ?? VizConfigs.convertVizConfig(outgoing, nextProps.vizType);

    return {
      props: nextProps,
      vizConfigMemory: {
        ...vizConfigMemory,
        [blockId]: { ...blockMemory, [outgoing.vizType]: outgoing },
      },
    };
  }

  if (changed.vizConfig && nextProps.vizConfig.vizType !== nextProps.vizType) {
    nextProps.vizType = nextProps.vizConfig.vizType;
  }

  return { props: nextProps, vizConfigMemory };
}
