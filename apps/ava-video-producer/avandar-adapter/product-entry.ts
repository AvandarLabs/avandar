/*
 * The esbuild entry `scripts/build-avandar.mjs` bundles into the generated
 * `product.js` bridge that films and the review harness import. It re-exports
 * the stage first so the stage's CSS and setup run before anything else.
 */
export { AvandarStage } from "./AvandarStage";
import { ATTRIBUTE_MAPPING_BEATS } from "./AttributeMappingScreen/AttributeMappingScreen";
import { CASES_BEATS } from "./CasesScreen/CasesScreen";
import { DASHBOARD_BEATS } from "./DashboardScreen/DashboardScreen";
import { EXPLORER_BEATS } from "./ExplorerScreen/explorerStage";
import { IMPORT_BEATS } from "./ImportScreen/ImportScreen";
import { MAP_BEATS } from "./MapScreen/MapScreen";
import { ONTOLOGY_BEATS } from "./OntologyScreen/OntologyScreen";

/**
 * Each feature's scripted cursor beats, keyed like `AvandarStage`'s `feature`
 * prop. `Review` exposes them on `window.review` so the `component:review`
 * harness can seek to a beat.
 */
export const FEATURE_BEATS = {
  import: IMPORT_BEATS,
  explorer: EXPLORER_BEATS,
  dashboards: DASHBOARD_BEATS,
  cases: CASES_BEATS,
  map: MAP_BEATS,
  ontology: ONTOLOGY_BEATS,
  "attribute-mapping": ATTRIBUTE_MAPPING_BEATS,
};
