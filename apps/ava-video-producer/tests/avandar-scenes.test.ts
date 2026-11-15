import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { storyboardSchema } from "../src/storyboard/schema/schema";

const root = fileURLToPath(new URL("../", import.meta.url));
const readJson = async (relative: string) =>
  JSON.parse(await fs.readFile(path.join(root, relative), "utf8"));
const sha256 = (bytes: Buffer) =>
  createHash("sha256").update(bytes).digest("hex");

test("compiled components match current workspace source for every feature", async () => {
  const manifest: {
    repository: string;
    revision: string;
    files: Array<{ path: string; sha256: string }>;
  } = await readJson("src/avandar/generated/build.json");
  assert.equal(manifest.repository, "AvandarLabs/avandar");
  assert.match(manifest.revision, /^[a-f0-9]{40}$/);
  assert.ok(manifest.files.length > 0);
  const sourcePaths = new Set(manifest.files.map((file) => file.path));
  assert.equal(sourcePaths.size, manifest.files.length);
  for (const file of manifest.files) {
    assert.ok(!path.isAbsolute(file.path) && !file.path.includes("\\"));
    assert.ok(
      file.path.split("/").every((part) => part && !part.startsWith(".")),
      file.path,
    );
    assert.match(file.path, /\.(tsx?|jsx?|css|json|svg|png|woff2?)$/);
    assert.match(file.sha256, /^[a-f0-9]{64}$/);
    const filename = path.resolve(root, "../..", file.path);
    assert.equal(
      await fs.realpath(filename),
      filename,
      `Product source must not escape through a symlink: ${file.path}`,
    );
    assert.equal(sha256(await fs.readFile(filename)), file.sha256, file.path);
  }
  for (const required of [
    "src/views/DataManagerApp/DataImportView/ManualUploadView/FileDropzone/FileDropzone.tsx",
    "src/lib/ui/viz/DataGrid.tsx",
    "src/components/sql/SqlEditor/SqlEditor.tsx",
    "src/views/DashboardApp/DashboardEditorView/useDashboardPuckConfig/useDashboardPuckConfig.tsx",
    "src/views/OntologyDesignerApp/CaseTypeHome/CaseTypeHome.tsx",
    "src/views/OntologyDesignerApp/CaseTypeHome/CaseTypeHome.module.css",
    "src/views/IndividualManagerApp/SingleIndividualView/RecordAttributesList.tsx",
    "src/views/IndividualManagerApp/SingleIndividualView/RecordAttributesList.module.css",
    "src/views/GisApp/shell/MapShell/MapShell.tsx",
    "src/views/GisApp/shell/MapShell/MapShell.module.css",
    "src/views/GisApp/MapCanvas/useMapCanvas.ts",
    "src/views/GisApp/layers/makeMapSpecFromLayerSpecs/makeLayerSpecFromMapLayer/makeLayerSpecFromMapLayer.ts",
    "src/views/GisApp/panels/LegendPanel/MapLegend/MapLegend.tsx",
  ])
    assert.ok(
      sourcePaths.has(required),
      `Missing actual product surface: ${required}`,
    );
  const build = await readJson("src/avandar/generated/build.json");
  assert.equal(build.revision, manifest.revision);
  assert.equal(build.sourceFiles, manifest.files.length);
  assert.equal(
    build.jsSha256,
    sha256(
      await fs.readFile(path.join(root, "src/avandar/generated/product.js")),
    ),
  );
  assert.ok(
    (await fs.stat(path.join(root, "src/avandar/generated/product.css"))).size >
      0,
  );
});

function film(
  feature = "cases",
  durationInFrames = 660,
  fromFrame = 0,
  mode = "full",
) {
  return {
    version: 1,
    id: "component-test",
    title: "Component test",
    description: "Fixture validation",
    sourceNotes: ["Synthetic test"],
    purpose: "standalone",
    fps: 30,
    width: 1600,
    height: 1000,
    delivery: { width: 1536, height: 960 },
    captions: true,
    shots: [
      {
        id: "body",
        scene: "avandar",
        durationInFrames,
        transitionInFrames: 0,
        props: { feature, fromFrame, mode },
      },
    ],
    narration: [
      {
        id: "cue",
        shotId: "body",
        startFrame: 0,
        endFrame: 1,
        text: "Fictional demonstration data.",
      },
    ],
  };
}

test("Avandar scenes enforce their authored feature, mode, stage and timeline bounds", () => {
  for (const [feature, horizon] of Object.entries({
    import: 660,
    explorer: 800,
    dashboards: 720,
    cases: 660,
    map: 720,
  })) {
    assert.equal(
      storyboardSchema.safeParse(film(feature, horizon)).success,
      true,
      feature,
    );
    assert.equal(
      storyboardSchema.safeParse(film(feature, 1, horizon - 1)).success,
      true,
      feature,
    );
    assert.equal(
      storyboardSchema.safeParse(film(feature, horizon, 1)).success,
      false,
      feature,
    );
    assert.equal(
      storyboardSchema.safeParse(film(feature, 1, horizon)).success,
      false,
      feature,
    );
  }
  for (const [mode, horizon] of Object.entries({
    filter: 300,
    query: 330,
    chart: 230,
  })) {
    assert.equal(
      storyboardSchema.safeParse(film("explorer", horizon, 0, mode)).success,
      true,
      mode,
    );
    assert.equal(
      storyboardSchema.safeParse(film("explorer", horizon, 1, mode)).success,
      false,
      mode,
    );
    assert.equal(
      storyboardSchema.safeParse(film("map", 100, 0, mode)).success,
      false,
      mode,
    );
  }
  for (const invalid of [
    film("unknown"),
    film("cases", 100, -1),
    film("cases", 100, 1.5),
    film("cases", 100, 0, "unknown"),
  ])
    assert.equal(storyboardSchema.safeParse(invalid).success, false);
  const wrongWidth = film();
  wrongWidth.width = 1280;
  wrongWidth.delivery = { width: 1280, height: 1000 };
  assert.equal(storyboardSchema.safeParse(wrongWidth).success, false);
  const wrongHeight = film();
  wrongHeight.height = 960;
  wrongHeight.delivery = { width: 1600, height: 960 };
  assert.equal(storyboardSchema.safeParse(wrongHeight).success, false);
  assert.equal(
    storyboardSchema.safeParse({ ...film(), captions: false }).success,
    false,
  );
  assert.equal(
    storyboardSchema.safeParse({
      ...film(),
      height: 840,
      delivery: { width: 1600, height: 840 },
      captions: false,
    }).success,
    true,
  );
});

test("all six final films use complete React feature bodies without screenshot media", async () => {
  for (const name of [
    "import",
    "explorer",
    "dashboards",
    "cases",
    "map",
    "avandar-overview",
  ]) {
    const plan = storyboardSchema.parse(
      await readJson(`storyboards/${name}.json`),
    );
    assert.ok(
      plan.shots.every(
        (shot) => shot.scene === "title" || shot.scene === "avandar",
      ),
      name,
    );
    const bodies = plan.shots.filter((shot) => shot.scene === "avandar");
    assert.deepEqual(
      bodies.map((shot) => shot.props.feature),
      name === "avandar-overview"
        ? ["import", "explorer", "dashboards"]
        : [name],
    );
    for (const body of bodies) {
      assert.equal(body.props.fromFrame, 0, name);
      assert.equal(body.props.mode, "full", name);
    }
  }
});
