import { Map as MapLibreMap } from "maplibre-gl";
import { mapSemanticColors } from "./mapColors";

/**
 * Applies Avandar custom colors to a MapLibre map instance.
 * This function modifies layer paint properties to use the custom color
 * palette.
 */
export function applyMapStyles(map: MapLibreMap): void {
  // Water layers
  if (map.getLayer("water")) {
    map.setPaintProperty("water", "fill-color", mapSemanticColors.water);
  }
  if (map.getLayer("waterway")) {
    map.setPaintProperty("waterway", "line-color", mapSemanticColors.waterway);
  }
  if (map.getLayer("ocean")) {
    map.setPaintProperty("ocean", "fill-color", mapSemanticColors.ocean);
  }

  // Background and land
  // Background layers typically have a "background-color" paint property
  if (map.getLayer("background")) {
    const layer = map.getLayer("background");
    if (layer && layer.type === "background") {
      map.setPaintProperty(
        "background",
        "background-color",
        mapSemanticColors.background,
      );
    }
  }
  if (map.getLayer("landcover")) {
    map.setPaintProperty(
      "landcover",
      "fill-color",
      mapSemanticColors.landcover,
    );
  }

  // Road layers - hierarchical styling
  if (map.getLayer("road-motorway")) {
    map.setPaintProperty(
      "road-motorway",
      "line-color",
      mapSemanticColors.roadMotorway,
    );
  }
  if (map.getLayer("road-trunk")) {
    map.setPaintProperty(
      "road-trunk",
      "line-color",
      mapSemanticColors.roadTrunk,
    );
  }
  if (map.getLayer("road-primary")) {
    map.setPaintProperty(
      "road-primary",
      "line-color",
      mapSemanticColors.roadPrimary,
    );
  }
  if (map.getLayer("road-secondary")) {
    map.setPaintProperty(
      "road-secondary",
      "line-color",
      mapSemanticColors.roadSecondary,
    );
  }
  if (map.getLayer("road-tertiary")) {
    map.setPaintProperty(
      "road-tertiary",
      "line-color",
      mapSemanticColors.roadTertiary,
    );
  }
  if (map.getLayer("road-residential")) {
    map.setPaintProperty(
      "road-residential",
      "line-color",
      mapSemanticColors.roadResidential,
    );
  }
  if (map.getLayer("road-service")) {
    map.setPaintProperty(
      "road-service",
      "line-color",
      mapSemanticColors.roadService,
    );
  }
  if (map.getLayer("road-path")) {
    map.setPaintProperty("road-path", "line-color", mapSemanticColors.roadPath);
  }

  if (map.getLayer("landuse-park")) {
    map.setPaintProperty("landuse-park", "fill-color", mapSemanticColors.park);
  }

  // Natural features
  if (map.getLayer("park")) {
    map.setPaintProperty("park", "fill-color", mapSemanticColors.park);
  }
  if (map.getLayer("grass")) {
    map.setPaintProperty("grass", "fill-color", mapSemanticColors.grass);
  }
  if (map.getLayer("forest")) {
    map.setPaintProperty("forest", "fill-color", mapSemanticColors.forest);
  }
  if (map.getLayer("wood")) {
    map.setPaintProperty("wood", "fill-color", mapSemanticColors.wood);
  }
  if (map.getLayer("vegetation")) {
    map.setPaintProperty("vegetation", "fill-color", mapSemanticColors.landuse);
  }

  // Building layers
  if (map.getLayer("building")) {
    map.setPaintProperty("building", "fill-color", mapSemanticColors.building);
    map.setPaintProperty(
      "building",
      "fill-outline-color",
      mapSemanticColors.buildingOutline,
    );
  }
  if (map.getLayer("building-extrusion")) {
    map.setPaintProperty(
      "building-extrusion",
      "fill-color",
      mapSemanticColors.buildingExtrusion,
    );
  }

  // Administrative boundaries
  if (map.getLayer("admin-boundary")) {
    map.setPaintProperty(
      "admin-boundary",
      "line-color",
      mapSemanticColors.adminBoundary,
    );
  }
  if (map.getLayer("admin-fill")) {
    map.setPaintProperty(
      "admin-fill",
      "fill-color",
      mapSemanticColors.adminFill,
    );
  }

  // Try alternative layer naming conventions that might exist in different
  // styles
  const allLayers = map.getStyle().layers;
  if (allLayers) {
    for (const layer of allLayers) {
      const layerId = layer.id;

      // Water variations
      if (layerId.includes("water") && layer.type === "fill") {
        if (!map.getPaintProperty(layerId, "fill-color")) {
          map.setPaintProperty(layerId, "fill-color", mapSemanticColors.water);
        }
      }

      // Road variations - check for common road layer patterns
      if (layerId.includes("road") || layerId.includes("highway")) {
        if (layer.type === "line") {
          if (layerId.includes("motorway") || layerId.includes("trunk")) {
            map.setPaintProperty(
              layerId,
              "line-color",
              mapSemanticColors.roadMotorway,
            );
          } else if (layerId.includes("primary")) {
            map.setPaintProperty(
              layerId,
              "line-color",
              mapSemanticColors.roadPrimary,
            );
          } else if (layerId.includes("secondary")) {
            map.setPaintProperty(
              layerId,
              "line-color",
              mapSemanticColors.roadSecondary,
            );
          } else if (layerId.includes("tertiary")) {
            map.setPaintProperty(
              layerId,
              "line-color",
              mapSemanticColors.roadTertiary,
            );
          } else if (layerId.includes("residential")) {
            map.setPaintProperty(
              layerId,
              "line-color",
              mapSemanticColors.roadResidential,
            );
          }
        }
      }

      // Park and natural features
      if (layerId.includes("park") && layer.type === "fill") {
        map.setPaintProperty(layerId, "fill-color", mapSemanticColors.park);
      }
      if (layerId.includes("forest") && layer.type === "fill") {
        map.setPaintProperty(layerId, "fill-color", mapSemanticColors.forest);
      }
      if (layerId.includes("wood") && layer.type === "fill") {
        map.setPaintProperty(layerId, "fill-color", mapSemanticColors.wood);
      }
      // Landuse/Vegetation/agricultural land - greenish-yellowish areas
      if (
        (layerId.includes("vegetation") ||
          layerId.includes("agricultural") ||
          layerId.includes("agriculture") ||
          (layerId.includes("landuse") &&
            !layerId.includes("park") &&
            !layerId.includes("forest") &&
            !layerId.includes("wood"))) &&
        layer.type === "fill"
      ) {
        map.setPaintProperty(layerId, "fill-color", mapSemanticColors.landuse);
      }

      // Buildings
      if (layerId.includes("building") && layer.type === "fill") {
        map.setPaintProperty(layerId, "fill-color", mapSemanticColors.building);
        if (map.getPaintProperty(layerId, "fill-outline-color") !== undefined) {
          map.setPaintProperty(
            layerId,
            "fill-outline-color",
            mapSemanticColors.buildingOutline,
          );
        }
      }
    }
  }
}
