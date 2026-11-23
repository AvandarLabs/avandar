import {
  BUILT_IN_VIDEO_THEMES,
  makeVideoThemeLibraryFromDocuments,
} from "../../../videoTheme/makeVideoThemeLibraryFromDocuments/makeVideoThemeLibraryFromDocuments";
import type { VideoThemeDocument } from "../../../videoTheme/videoTheme.types";

/** Theme-wide edit target used by theme draft tests. */
export const THEME = { kind: "theme" } as const;
/** Network-graph override target used by theme draft tests. */
export const ITEM = { kind: "item", itemId: "network-graph" } as const;
/** Typography token fixture used by theme draft tests. */
export const HEADING = {
  family: "$atomic.fontFamily.figtree",
  size: "$fontSizes.8xl",
  weight: "$atomic.fontWeight.bold",
  color: "$color.text",
};
/** Inherited theme with an item override used by theme draft tests. */
export const STUDIO: VideoThemeDocument = {
  schemaVersion: 1,
  id: "studio",
  label: "Studio",
  extends: "classic",
  other: { video: { atomic: { swatch: { ground: "#201510" } } } },
  overrides: {
    "network-graph": {
      other: {
        video: { semantic: { color: { accent: "$atomic.swatch.orange" } } },
      },
    },
  },
};
/** Theme library containing the studio fixture for theme draft tests. */
export const LIBRARY = makeVideoThemeLibraryFromDocuments([STUDIO]);

/**
 * Classic with a per-item accent override, like the accents classic authors per
 * composition.
 */
export const CLASSIC_WITH_OVERRIDE = new Map<string, VideoThemeDocument>([
  ...BUILT_IN_VIDEO_THEMES,
  [
    "classic",
    {
      ...BUILT_IN_VIDEO_THEMES.get("classic")!,
      overrides: {
        "network-graph": {
          other: {
            video: { semantic: { color: { accent: "$atomic.swatch.orange" } } },
          },
        },
      },
    },
  ],
]);
