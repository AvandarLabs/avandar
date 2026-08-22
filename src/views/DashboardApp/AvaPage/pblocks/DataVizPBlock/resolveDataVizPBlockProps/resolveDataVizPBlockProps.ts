import type { Props as DataVizPBlockProps } from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/DataVizPBlock";
import type { ResolveDataTrigger } from "@puckeditor/core";

import { VizConfigs } from "$/models/vizs/VizConfig/VizConfigs";
import { DataVizFilters } from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/DataVizFilters/DataVizFilters";

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
 * Keeps `vizType` and `vizConfig.vizType` in sync by running
 * `VizConfigs.convertVizConfig` whenever the user picks a different type from
 * the top-level select. Also fills in defaults for missing fields so older
 * saved blocks or freshly created ones always resolve to a fully-shaped
 * `DataVizPBlockProps`.
 */
export function resolveDataVizPBlockProps(input: {
  props: Partial<DataVizPBlockProps>;
  changed: ChangedFlags;
  trigger?: ResolveDataTrigger;
}): DataVizPBlockProps {
  const { props, changed, trigger } = input;
  // Puck's load pass marks every field `changed` because its resolver cache
  // is empty. Rewriting here would look like an unsaved edit. Missing filter
  // defaults are filled at render time instead.
  if (trigger === "load") {
    return props as DataVizPBlockProps;
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
    nextProps.vizConfig = VizConfigs.convertVizConfig(
      nextProps.vizConfig,
      nextProps.vizType,
    );
  } else if (
    changed.vizConfig &&
    nextProps.vizConfig.vizType !== nextProps.vizType
  ) {
    nextProps.vizType = nextProps.vizConfig.vizType;
  }

  return nextProps;
}
