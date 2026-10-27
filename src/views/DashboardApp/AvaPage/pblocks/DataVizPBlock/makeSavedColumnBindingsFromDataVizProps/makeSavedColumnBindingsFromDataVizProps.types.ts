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
  vizConfig: VizConfig.Legacy;
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
 * Persisted compatibility envelope. Legacy names remain intact until
 * resolvable.
 */
export type DataVizColumnBindingProps =
  | DataVizColumnNameProps
  | DataVizColumnIdProps;
