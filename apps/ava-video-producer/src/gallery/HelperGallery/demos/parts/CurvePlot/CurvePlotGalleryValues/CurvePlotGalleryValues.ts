/** Lowest and highest plotted value, so overshooting curves stay visible. */
const Y_RANGE = [-0.3, 1.3] as const;

/** Maps curve time and value to plot pixels. */
function _makeScaleFromSize(size: number): Scale {
  return {
    toX: (value: number) => {
      return value * size;
    },
    toY: (value: number) => {
      return size - ((value - Y_RANGE[0]) / (Y_RANGE[1] - Y_RANGE[0])) * size;
    },
  };
}

/** Maps curve time and value to coordinates inside the easing plot. */
export type Scale = {
  toX: (value: number) => number;
  toY: (value: number) => number;
};

/** Coordinate transforms shared by the easing plot and its handles. */
export const CurvePlotGalleryValues = {
  /** Converts a plot size into its coordinate transforms. */
  makeScaleFromSize: _makeScaleFromSize,
};
