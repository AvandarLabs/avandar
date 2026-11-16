import fs from "node:fs/promises";
import path from "node:path";
import { createRealTempDirectory } from "./createRealTempDirectory";
import { buildLicenseFixture } from "./license-fixture";
import { linkAppDependencies } from "./linkAppDependencies";

/**
 * Copies the showcase pages and their sources into a temporary app root,
 * with a stub product bundle and a palette reader that needs no product
 * checkout.
 */
async function _populateShowcaseFixture(root: string): Promise<void> {
  await linkAppDependencies(root);
  await fs.writeFile(path.join(root, ".env.local"), buildLicenseFixture());
  await Promise.all(
    [
      "scripts",
      "src",
      "showcase",
      "themes",
      "public/fonts",
      "public/avandar",
    ].map((directory) =>
      fs.cp(directory, path.join(root, directory), {
        recursive: true,
        // Skips generated output the fixture replaces with a stub.
        filter: (source) => !source.includes(`${path.sep}generated${path.sep}`),
      }),
    ),
  );
  await fs.writeFile(
    path.join(root, "scripts/readTheme.ts"),
    'import fs from "node:fs"; process.stdout.write(fs.readFileSync(new URL("../src/gallery/theme-colors.json",import.meta.url),"utf8"));',
  );
  const product = path.join(root, "out/showcase/product");
  await fs.mkdir(product, { recursive: true });
  await fs.writeFile(
    path.join(product, "product.js"),
    "export const AvandarStage = () => null;\nexport const FEATURE_BEATS = {};\n",
  );
  await fs.writeFile(path.join(product, "product.css"), "");
}

/**
 * Creates a temporary app root holding the showcase pages and their sources,
 * with a stub product bundle and a palette reader that needs no product
 * checkout, and returns its path. Use it in a test that builds or watches the
 * showcase site, for example a Vite production build check.
 */
export async function createShowcaseFixture(prefix: string): Promise<string> {
  const root = await createRealTempDirectory(prefix);
  await _populateShowcaseFixture(root);
  return root;
}
