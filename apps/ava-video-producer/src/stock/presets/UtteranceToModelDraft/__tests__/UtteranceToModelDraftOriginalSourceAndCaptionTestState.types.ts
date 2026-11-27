import type { fixtures } from "../UtteranceToModelDraft.fixtures";
import type { renderToStaticMarkup } from "react-dom/server";

/** Inputs consumed by the corresponding rendered assertions. */

export type AssertOriginalSourceCaptionPaintMarkupOptions = {
  markup: ReturnType<typeof renderToStaticMarkup>;
  input: (typeof fixtures)[number]["input"];
  backing: string;
  bottom: number;
};
