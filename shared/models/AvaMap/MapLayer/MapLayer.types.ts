import type { Model } from "@avandar/models";
import type { UUID } from "@avandar/utils";
import type {
  DisputedStatusRef,
  DisputedStatusValues,
} from "$/models/AvaMap/MapLayer/DisputedStatus.types.ts";
import type {
  AreaGeoBinding,
  GeoBinding,
} from "$/models/AvaMap/MapLayer/GeoBinding.types.ts";
import type {
  FillSymbology,
  LayerSymbology, // prettier-ignore
} from "$/models/AvaMap/MapLayer/LayerSymbology.types.ts";
import type {
  LegendConfig, // prettier-ignore
} from "$/models/AvaMap/MapLayer/LegendConfig.types.ts";
import type {
  AggregateOnlySensitivity,
  ExactSensitivity,
  JitterSensitivity,
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

type MapLayerCommon = {
  id: MapLayerId;
  name: string;
  isVisible: boolean;

  /** The query producing this layer's rows. */
  source: StructuredQuery.Partial;

  popup: PopupConfig;
  legend: LegendConfig;

  /** Query column used to filter features by time, when set. */
  timeColumn: QueryColumn.Id | undefined;

  /** Whether features outside the map's AOI are excluded. */
  applyAoiFilter: boolean;

  /** Column carrying disputed-boundary status, or unset when all settled. */
  disputedStatusColumn: DisputedStatusRef | undefined;

  /** Which source values mean disputed and which mean undetermined. */
  disputedStatusValues: DisputedStatusValues;
};

type LayerProtectionAndRendering =
  | {
      sensitivity: ExactSensitivity | JitterSensitivity;
      geoBinding: GeoBinding | undefined;
      symbology: LayerSymbology;
    }
  | {
      sensitivity: AggregateOnlySensitivity;
      geoBinding: AreaGeoBinding | undefined;
      symbology: FillSymbology;
    };

/**
 * One layer of a map. The three axes are independent: `source` decides which
 * rows, `geoBinding` decides how those rows become geometry, and `symbology`
 * decides how that geometry is painted. `sensitivity` constrains `symbology`.
 */
export type StandardMapLayerRead = Model.Versioned<
  ModelType,
  CurrentMapLayerVersion,
  MapLayerCommon &
    Extract<
      LayerProtectionAndRendering,
      { sensitivity: ExactSensitivity | JitterSensitivity }
    >
>;

export type AggregateOnlyMapLayerRead = Model.Versioned<
  ModelType,
  CurrentMapLayerVersion,
  MapLayerCommon &
    Extract<
      LayerProtectionAndRendering,
      { sensitivity: AggregateOnlySensitivity }
    >
>;

/**
 * A map layer whose sensitivity structurally constrains its binding and paint.
 */
export type MapLayerRead = StandardMapLayerRead | AggregateOnlyMapLayerRead;
