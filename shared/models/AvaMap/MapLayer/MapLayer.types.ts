import type { Model } from "@avandar/models";
import type { UUID } from "@avandar/utils";
import type { GeoBinding } from "$/models/AvaMap/MapLayer/GeoBinding.types.ts";
import type { LayerSymbology } from "$/models/AvaMap/MapLayer/LayerSymbology.types.ts";
import type { LegendConfig } from "$/models/AvaMap/MapLayer/LegendConfig.types.ts";
import type { SensitivityPolicy } from "$/models/AvaMap/MapLayer/SensitivityPolicy.types.ts";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import type { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery.ts";

type ModelType = "MapLayer";
type CurrentMapLayerVersion = 1;

export type MapLayerId = UUID<ModelType>;

/**
 * Which columns a feature's popup shows. `"all"` shows every column the
 * layer's query returned.
 */
export type PopupConfig = { columnIds: readonly QueryColumn.Id[] | "all" };

/**
 * One layer of a map. The three axes are independent: `source` decides which
 * rows, `geoBinding` decides how those rows become geometry, and `symbology`
 * decides how that geometry is painted. `sensitivity` constrains `symbology`.
 */
export type MapLayerRead = Model.Versioned<
  ModelType,
  CurrentMapLayerVersion,
  {
    id: MapLayerId;
    name: string;
    isVisible: boolean;

    /** The query producing this layer's rows. */
    source: StructuredQuery.Partial;

    /** Undefined until the author has picked geometry columns. */
    geoBinding: GeoBinding | undefined;

    symbology: LayerSymbology;
    sensitivity: SensitivityPolicy;
    popup: PopupConfig;
    legend: LegendConfig;
  }
>;
