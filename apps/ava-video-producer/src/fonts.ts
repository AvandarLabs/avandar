import {
  cancelRender,
  continueRender,
  delayRender,
  staticFile,
} from "remotion";

/** Locally bundled Geist keeps previews and exports independent of font CDNs. */
export const FACE = "Geist";
// Register once per document and hold rendering until the shared face is ready.
if (typeof document !== "undefined") {
  const handle = delayRender("Load local Geist font");
  const face = new FontFace(
    FACE,
    `url(${staticFile("fonts/geist-latin.woff2")})`,
    { weight: "100 900", style: "normal" },
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
export const TYPE = `${FACE}, Inter, ui-sans-serif, system-ui, sans-serif`;
