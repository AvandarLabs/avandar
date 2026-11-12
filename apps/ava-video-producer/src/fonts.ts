import {
  cancelRender,
  continueRender,
  delayRender,
  staticFile,
} from "remotion";

/**
 * Avandar's brand typeface. Bundled locally so previews and exports stay
 * independent of font CDNs.
 */
export const FACE = "Figtree";
// Register once per document and hold rendering until the shared face is ready.
if (typeof document !== "undefined") {
  const handle = delayRender("Load local Figtree font");
  const face = new FontFace(
    FACE,
    `url(${staticFile("fonts/figtree-latin.woff2")})`,
    { weight: "300 900", style: "normal" },
  );
  void face
    .load()
    .then((loaded) => {
      document.fonts.add(loaded);
      continueRender(handle);
    })
    .catch(cancelRender);
}

/** Shared composition typography. Product scenes retain their own source font. */
export const TYPE = `${FACE}, ui-sans-serif, system-ui, sans-serif`;

/** Monospace stack for commands, code and terminal text drawn by scenes. */
export const MONO =
  "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace";
