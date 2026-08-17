/**
 * Thrown when a layer's sensitivity policy forbids the geometry it was asked
 * to produce.
 *
 * A layer's sensitivity policy (`MapLayer.Sensitivity`) states what
 * rendering its data permits, independent of what the map author picked:
 * - `exact` draws coordinates as given,
 * - `jitter` displaces each point inside a radius
 * - `aggregateOnly` forbids drawing individual points at all.
 *
 * A request is rejected when honoring it would expose more precise locations
 * than the policy allows. This is a hard failure rather than a silent
 * downgrade, because quietly drawing something coarser would leave the map
 * looking like it had rendered the data faithfully.
 *
 * For example, a layer of household survey responses carrying
 * `{ mode: "aggregateOnly", minCellCount: 5 }` may only ever be shown as
 * counts per boundary. Asking `makeFeatureCollectionFromRows` for one point per
 * respondent would reveal exactly the addresses the policy protects, so it
 * throws instead, and the map surfaces the error in its status overlay.
 */
export class SensitivityViolationError extends Error {
  /** Machine-readable reason the requested geometry is forbidden. */
  readonly code: "aggregateOnly" | "aggregateOnlyLayerSpec";

  /** Layer name associated with a layer-spec failure. */
  readonly layerName: string | undefined;

  /** Creates a sensitivity-policy error without formatting display copy. */
  constructor(
    code: "aggregateOnly" | "aggregateOnlyLayerSpec",
    layerName?: string,
  ) {
    super(code);
    this.name = "SensitivityViolationError";
    this.code = code;
    this.layerName = layerName;
  }
}
