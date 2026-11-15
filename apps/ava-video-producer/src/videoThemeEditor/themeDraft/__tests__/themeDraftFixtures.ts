import {
  BUILT_IN_VIDEO_THEMES,
  createVideoThemeLibrary,
} from "../../../videoTheme/builtInVideoThemes/builtInVideoThemes";
import type { VideoThemeDocument } from "../../../videoTheme/videoTheme.types";

export const THEME = { kind: "theme" } as const;
export const ITEM = { kind: "item", itemId: "network-graph" } as const;
export const HEADING = {
  family: "$atomic.fontFamily.figtree",
  size: "$fontSizes.8xl",
  weight: "$atomic.fontWeight.bold",
  color: "$color.text",
};
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
export const LIBRARY = createVideoThemeLibrary([STUDIO]);

/** Classic with a per-item accent override, like the accents classic authors per composition. */
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
