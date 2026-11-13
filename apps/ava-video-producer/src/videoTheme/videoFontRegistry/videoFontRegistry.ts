import registry from "./videoFontRegistry.json";

/** A registered font id, such as `figtree` or `courier`. */
export type VideoFontId = keyof typeof registry;

/** A face shipped as a woff2 in `public/fonts` and loaded before rendering. */
export type BundledVideoFont = Readonly<{
  label: string;
  source: "bundled";
  file: string;
  face: string;
  weight: string;
  stack: string;
  measured: boolean;
}>;

/** A face expected on the rendering machine, such as Arial. */
export type SystemVideoFont = Readonly<{
  label: string;
  source: "system";
  stack: string;
  measured: boolean;
}>;

/** One family a video theme may name. */
export type VideoFont = BundledVideoFont | SystemVideoFont;

/**
 * Every font family a video theme can name. Themes pick fonts from here,
 * never as free text, so a render can always load what a theme asks for.
 * Graphic text accepts only `measured` faces, whose glyph widths the stock
 * text-fit checks know. For example, the resolver rejects Figtree for a
 * graphic label, and the editor lists only these families.
 */
export const VIDEO_FONT_REGISTRY = registry as Readonly<
  Record<VideoFontId, VideoFont>
>;

/** Registered font ids in registry order, for schemas and pickers. */
export const VIDEO_FONT_IDS = Object.keys(registry) as readonly VideoFontId[];

/** CSS stacks of every registered font, for Mantine's font keys. */
export const VIDEO_FONT_STACKS: readonly string[] = VIDEO_FONT_IDS.map(
  (id) => VIDEO_FONT_REGISTRY[id].stack,
);

/**
 * The registered font whose CSS stack this is, or undefined. Use it to map a
 * Mantine `fontFamily` value back to a registry entry.
 */
export function getVideoFontIdFromStack(
  stack: string,
): VideoFontId | undefined {
  return VIDEO_FONT_IDS.find((id) => VIDEO_FONT_REGISTRY[id].stack === stack);
}

/**
 * Bundled faces with their ids, for loading them before a render and for
 * writing `@font-face` rules.
 */
export function listBundledVideoFonts(): readonly (BundledVideoFont & {
  id: VideoFontId;
})[] {
  return VIDEO_FONT_IDS.flatMap((id) => {
    const font = VIDEO_FONT_REGISTRY[id];
    return font.source === "bundled" ? [{ ...font, id }] : [];
  });
}
