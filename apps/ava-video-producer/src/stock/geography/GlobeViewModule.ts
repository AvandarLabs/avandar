/**
 * Orthographic view coordinates use external degrees and a positive SVG radius.
 */
export type GlobeView = {
  centerLongitude: number;
  centerLatitude: number;
  radius: number;
};

/** Validates a globe view and normalizes equivalent longitude wraps. */
function _getGlobeViewFromInput(view: Readonly<GlobeView>): GlobeView {
  if (
    ![view.centerLongitude, view.centerLatitude, view.radius].every(
      Number.isFinite,
    ) ||
    Math.abs(view.centerLatitude) > 90 ||
    view.radius <= 0
  ) {
    throw new Error(
      "A globe view needs finite degrees, a valid latitude and a positive radius.",
    );
  }
  return {
    ...view,
    centerLongitude: _getNormalizedLongitudeFromLongitude(view.centerLongitude),
  };
}

/** Canonical longitude degrees keep equivalent wrapped inputs identical. */
function _getNormalizedLongitudeFromLongitude(longitude: number): number {
  if (!Number.isFinite(longitude)) {
    throw new Error("Longitude must be finite.");
  }
  return ((((longitude + 180) % 360) + 360) % 360) - 180;
}

/** Related globe view module operations. */
export const GlobeViewModule = {
  /** Validates a globe view and normalizes equivalent longitude wraps. */
  fromInput: _getGlobeViewFromInput,
  /** Canonical longitude degrees keep equivalent wrapped inputs identical. */
  getNormalizedLongitudeFromLongitude: _getNormalizedLongitudeFromLongitude,
} satisfies {
  fromInput: typeof _getGlobeViewFromInput;
  getNormalizedLongitudeFromLongitude: typeof _getNormalizedLongitudeFromLongitude;
};
