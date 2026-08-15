import type { Model } from "@avandar/models";
import type { UUID } from "@avandar/utils";
import type {
  GeoBinding, // prettier-ignore
} from "$/models/AvaMap/MapLayer/GeoBinding.types.ts";
import type {
  LayerSymbology, // prettier-ignore
} from "$/models/AvaMap/MapLayer/LayerSymbology.types.ts";
import type {
  LegendConfig, // prettier-ignore
} from "$/models/AvaMap/MapLayer/LegendConfig.types.ts";
import type {
  SensitivityPolicy, // prettier-ignore
} from "$/models/AvaMap/MapLayer/SensitivityPolicy.types.ts";
import type {
  QueryColumn, // prettier-ignore
} from "$/models/queries/QueryColumn/QueryColumn.ts";
import type {
  StructuredQuery, // prettier-ignore
} from "$/models/queries/StructuredQuery/StructuredQuery.ts";

type ModelType = "MapLayer";
type CurrentMapLayerVersion = 1;

export type MapLayerId = UUID<ModelType>;

/**
 * A link shown at the foot of a feature's popup, for clicking through to the
 * record the feature came from.
 *
 * `urlTemplate` carries `{columnName}` placeholders, filled from the clicked
 * feature's properties. A placeholder naming a column the popup did not
 * select stays literal rather than resolving to `undefined`, so a broken
 * template is visible instead of producing a plausible wrong URL.
 */
export type PopupLinkAction = { label: string; urlTemplate: string };

/**
 * Which columns a feature's popup shows. `"all"` shows every column the
 * layer's query returned.
 */
export type PopupConfig = {
  columnIds: readonly QueryColumn.Id[] | "all";
  action: PopupLinkAction | undefined;
};

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
