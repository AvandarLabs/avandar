import type { ResultColumnBindingRegistry } from "$/models/queries/QueryColumnBindings/QueryColumnBindings.types";
import type { VizConfig } from "$/models/vizs/VizConfig/VizConfig";
import type {
  GlobalFilterSubscription,
  LegacyLocalFilter,
  LocalFilter,
} from "../DataVizPBlock/DataVizFilters/DataVizFilters";
import type { DashboardFilterTargets } from "@/views/DashboardApp/DashboardFilterStateManager/makeColumnBindingsFromDashboardFilters/makeColumnBindingsFromDashboardFilters";

type DataVizColumnNameProps = {
  columnBindingVersion: 0;
  vizConfig: VizConfig.NameResolved;
  localFilters: readonly LegacyLocalFilter[];
  globalFilterSubscription: GlobalFilterSubscription;
};

type DataVizColumnIdProps = {
  columnBindingVersion: 1;
  vizConfig: VizConfig.T;
  columnBindings: ResultColumnBindingRegistry;
  localFilters: readonly LocalFilter[];
  globalFilterSubscription: GlobalFilterSubscription;
  globalFilterTargets: DashboardFilterTargets;
};

/**
 * Saved column references of a DataViz block. `columnBindingVersion: 0` is the
 * name-keyed form saved before column IDs, kept intact until every name binds.
 * That variant, `LegacyLocalFilter`, `mergeLegacyVizConfigEdit`,
 * `synchronizeLegacyVizType`, and `updateLegacy` exist only to read and edit
 * it, and can be deleted once no `dashboards.config` row holds a version 0
 * DataViz block.
 */
export type DataVizColumnBindingProps =
  | DataVizColumnNameProps
  | DataVizColumnIdProps;
