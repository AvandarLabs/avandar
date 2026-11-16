import { buildProduct } from "../buildProduct/buildProduct";
import { requireLicense } from "../requireLicense";
import { buildShowcaseSite } from "./buildShowcaseSite";
import { makeShowcasePathsFromAppRoot } from "./makeShowcasePathsFromAppRoot";
import { appRoot } from "./ShowcaseFilms/ShowcaseFilms";

// `pnpm motion:build`: build the Motion Atlas and every other showcase page.
requireLicense();
await buildProduct({
  outputDirectory: makeShowcasePathsFromAppRoot(appRoot).product,
});
await buildShowcaseSite(appRoot);
