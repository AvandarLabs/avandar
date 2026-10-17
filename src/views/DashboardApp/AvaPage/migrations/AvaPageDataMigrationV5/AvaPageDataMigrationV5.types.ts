import type { DataVizBindingProps } from "../../pblocks/DataVizPBlock/resolveSavedDataVizBindings/resolveSavedDataVizBindings";
import type {
  V4_AvaPageData,
  V4_AvaPageRootProps,
  V4_PBlockPropsRegistry,
} from "../AvaPageDataMigrationV4/AvaPageDataMigrationV4.types";
import type { Data } from "@puckeditor/core";

export type { V4_AvaPageData };
/** V5 retains legacy envelopes while permitting stable chart-owned targets. */
export type V5_PBlockPropsRegistry = Omit<V4_PBlockPropsRegistry, "DataViz"> & {
  DataViz: Omit<
    V4_PBlockPropsRegistry["DataViz"],
    "vizConfig" | "localFilters" | "globalFilterSubscription"
  > &
    DataVizBindingProps;
};
export type V5_AvaPageRootProps = Omit<V4_AvaPageRootProps, "schemaVersion"> & {
  schemaVersion: 5;
};
export type V5_AvaPageData = Data<V5_PBlockPropsRegistry, V5_AvaPageRootProps>;
