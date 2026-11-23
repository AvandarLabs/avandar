import {
  cancelRender,
  continueRender,
  delayRender,
  staticFile,
} from "remotion";
import {
  VIDEO_FONT_REGISTRY,
  VideoFonts,
} from "./videoTheme/videoFontRegistry/VideoFonts";

// Register every bundled face once per document and hold rendering until each
// one is ready, so previews and exports never depend on a font CDN.
if (typeof document !== "undefined") {
  VideoFonts.listBundledVideoFonts().forEach((font) => {
    const handle = delayRender(`Load local ${font.label} font`);
    const face = new FontFace(font.face, `url(${staticFile(font.file)})`, {
      weight: font.weight,
      style: "normal",
    });
    void face
      .load()
      .then((loaded) => {
        document.fonts.add(loaded);
        continueRender(handle);
      })
      .catch(cancelRender);
  });
}

/** Avandar's brand typeface name, for code that names the face directly. */
export const FACE = "Figtree";

/**
 * Shared composition typography. Product scenes retain their own source font.
 */
export const TYPE = VIDEO_FONT_REGISTRY.figtree.stack;

/** Monospace stack for commands, code and terminal text drawn by scenes. */
export const MONO = VIDEO_FONT_REGISTRY.systemMono.stack;
