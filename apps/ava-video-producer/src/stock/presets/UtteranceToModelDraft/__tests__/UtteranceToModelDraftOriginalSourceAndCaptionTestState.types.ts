import type { renderToStaticMarkup } from "react-dom/server";
import type { fixtures } from "../UtteranceToModelDraft.fixtures";

/** Inputs consumed by the corresponding rendered assertions. */

export type AssertOriginalSourceCaptionPaintMarkupOptions = {
  markup: ReturnType<typeof renderToStaticMarkup>;
  input: (typeof fixtures)[number]["input"];
  backing: string;
  bottom: number;
};
