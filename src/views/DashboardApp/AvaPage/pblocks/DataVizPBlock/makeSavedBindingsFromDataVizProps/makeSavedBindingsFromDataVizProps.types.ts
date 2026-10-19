import type { ResultBindingRegistry } from "$/models/queries/QueryColumnBindings/QueryColumnBindings.types";
import type { VizConfig } from "$/models/vizs/VizConfig/VizConfig";
import type {
  GlobalFilterSubscription,
  LegacyLocalFilter,
  LocalFilter,
} from "../DataVizPBlock/DataVizFilters/DataVizFilters";
import type { DashboardFilterTargets } from "@/views/DashboardApp/DashboardFilterStateManager/makeBindingsFromDashboardFilters/makeBindingsFromDashboardFilters";
type LegacyDataVizBindingProps = {
  bindingVersion: 0;
  vizConfig: VizConfig.Legacy;
  localFilters: readonly LegacyLocalFilter[];
  globalFilterSubscription: GlobalFilterSubscription;
};

type BoundDataVizBindingProps = {
  bindingVersion: 1;
  vizConfig: VizConfig.T;
  columnBindings: ResultBindingRegistry;
  localFilters: readonly LocalFilter[];
  globalFilterSubscription: GlobalFilterSubscription;
  globalFilterTargets: DashboardFilterTargets;
};

/**
 * Persisted compatibility envelope. Legacy names remain intact until
 * resolvable.
 */
export type DataVizBindingProps =
  | LegacyDataVizBindingProps
  | BoundDataVizBindingProps;
