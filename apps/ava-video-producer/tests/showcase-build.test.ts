import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { buildShowcaseSite } from "../scripts/showcase/buildShowcaseSite";
import { SHOWCASE_PAGES } from "../scripts/showcase/makeShowcaseViteConfigFromAppRoot";
import { createShowcaseFixture } from "./createShowcaseFixture";
import { getLocalAssetPathsFromHtml } from "./getLocalAssetPathsFromHtml";

test("the Vite production build emits every showcase page with its scripts and styles", async () => {
  const root = await createShowcaseFixture("showcase-build-");
  try {
    await buildShowcaseSite(root);
    const site = path.join(root, "out/showcase/browser");
    await Promise.all(
      SHOWCASE_PAGES.map(async (page) => {
        const html = await fs.readFile(path.join(site, `${page}.html`), "utf8");
        const assets = getLocalAssetPathsFromHtml(html);
        if (page !== "compositions") {
          assert.ok(
            assets.some((asset) => asset.endsWith(".js")),
            `${page}.html loads no built script`,
          );
          assert.ok(
            assets.some((asset) => asset.endsWith(".css")),
            `${page}.html loads no built stylesheet`,
          );
        }
        await Promise.all(
          assets.map((asset) => fs.access(path.join(site, asset))),
        );
      }),
    );
    const scripts = await fs.readdir(path.join(site, "bundles"));
    assert.ok(
      !scripts.some((file) => /\.(?:tsx?|mjs)$/.test(file)),
      "Source modules must not be copied into the built site",
    );
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
