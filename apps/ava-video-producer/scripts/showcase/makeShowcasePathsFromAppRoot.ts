import path from "node:path";

/** Where the showcase reads its pages and writes each generated output. */
export type ShowcasePaths = {
  /** The Vite root: the page HTML, shell scripts, and stylesheets. */
  pages: string;
  /** Tracked posters and captions the pages and players load at runtime. */
  assets: string;
  /** The built site the showcase server serves. */
  site: string;
  /** The compiled Avandar product bundle the live player imports. */
  product: string;
  /** The palette stylesheet generated from the Avandar theme. */
  theme: string;
};

/** Resolves the showcase's source and output folders for an app root. */
export function makeShowcasePathsFromAppRoot(appRoot: string): ShowcasePaths {
  const pages = path.join(appRoot, "showcase");
  return {
    pages,
    assets: path.join(pages, "assets"),
    site: path.join(appRoot, "out/showcase/browser"),
    product: path.join(appRoot, "out/showcase/product"),
    theme: path.join(appRoot, "out/showcase/theme"),
  };
}
