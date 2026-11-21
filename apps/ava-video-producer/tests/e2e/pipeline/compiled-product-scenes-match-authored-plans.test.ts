import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { prop } from "@avandar/utils";
import { storyboardSchema } from "../../../src/storyboard/schema/schema";

type FilmParams = {
  feature?: string;
  durationInFrames?: number;
  fromFrame?: number;
  mode?: string;
};

const root = fileURLToPath(new URL("../../../", import.meta.url));

const _readJson = async (relative: string) => {
  return JSON.parse(await fs.readFile(path.join(root, relative), "utf8"));
};

const _sha256 = (bytes: Buffer) => {
  return createHash("sha256").update(bytes).digest("hex");
};

type FeatureTimelineParams = { feature: string; horizon: number };

type BuildManifest = {
  repository: string;
  revision: string;
  files: Array<{
    path: string;
    sha256: string;
  }>;
};

async function _assertSourceFileBytes(
  file: Readonly<BuildManifest["files"][number]>,
): Promise<void> {
  assert.ok(!path.isAbsolute(file.path) && !file.path.includes("\\"));
  assert.ok(
    file.path.split("/").every((part) => {
      return part && !part.startsWith(".");
    }),
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
  assert.equal(_sha256(await fs.readFile(filename)), file.sha256, file.path);
}

function _assertRequiredProductSurfaces(
  sourcePaths: ReadonlySet<string>,
): void {
  Array.from([
    "src/views/DataManagerApp/DataImportView/ManualUploadView/FileDropzone/FileDropzone.tsx",
    "src/lib/ui/viz/DataGrid.tsx",
    "src/components/sql/SqlEditor/SqlEditor.tsx",
    "src/views/DashboardApp/DashboardEditorView/useDashboardPuckConfig/useDashboardPuckConfig.tsx",
    "src/views/OntologyDesignerApp/CaseTypeHome/CaseTypeHome.tsx",
    "src/views/OntologyDesignerApp/CaseTypeHome/CaseTypeHome.module.css",
    "src/views/IndividualManagerApp/SingleIndividualView/CaseDetailsRail.tsx",
    "src/views/IndividualManagerApp/SingleIndividualView/CaseDetailsRail.module.css",
    "src/views/GisApp/shell/MapShell/MapShell.tsx",
    "src/views/GisApp/shell/MapShell/MapShell.module.css",
    "src/views/GisApp/MapCanvas/useMapCanvas.ts",
    "src/views/GisApp/layers/makeMapSpecFromLayerSpecs/makeLayerSpecFromMapLayer/makeLayerSpecFromMapLayer.ts",
    "src/views/GisApp/panels/LegendPanel/MapLegend/MapLegend.tsx",
  ]).forEach((required) => {
    assert.ok(
      sourcePaths.has(required),
      `Missing actual product surface: ${required}`,
    );
  });
}

async function _assertBuiltProductMatchesManifest(
  manifest: Readonly<BuildManifest>,
): Promise<void> {
  const build = await _readJson("src/avandar/generated/build.json");
  assert.equal(build.revision, manifest.revision);
  assert.equal(build.sourceFiles, manifest.files.length);
  assert.equal(
    build.jsSha256,
    _sha256(
      await fs.readFile(path.join(root, "src/avandar/generated/product.js")),
    ),
  );
  assert.ok(
    (await fs.stat(path.join(root, "src/avandar/generated/product.css"))).size >
      0,
  );
}

function _makeFilm({
  feature = "cases",
  durationInFrames = 660,
  fromFrame = 0,
  mode = "full",
}: Readonly<FilmParams> = {}) {
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

function _assertInvalidStageAndCaptionConfigurations(): void {
  Array.from([
    _makeFilm({ feature: "unknown" }),
    _makeFilm({
      feature: "cases",
      durationInFrames: 100,
      fromFrame: -1,
    }),
    _makeFilm({
      feature: "cases",
      durationInFrames: 100,
      fromFrame: 1.5,
    }),
    _makeFilm({
      feature: "cases",
      durationInFrames: 100,
      fromFrame: 0,
      mode: "unknown",
    }),
  ]).forEach((invalid) => {
    assert.equal(storyboardSchema.safeParse(invalid).success, false);
  });
  const wrongWidth = _makeFilm({});
  wrongWidth.width = 1280;
  wrongWidth.delivery = { width: 1280, height: 1000 };
  assert.equal(storyboardSchema.safeParse(wrongWidth).success, false);
  const wrongHeight = _makeFilm({});
  wrongHeight.height = 960;
  wrongHeight.delivery = { width: 1600, height: 960 };
  assert.equal(storyboardSchema.safeParse(wrongHeight).success, false);
  assert.equal(
    storyboardSchema.safeParse({ ..._makeFilm({}), captions: false }).success,
    false,
  );
  assert.equal(
    storyboardSchema.safeParse({
      ..._makeFilm({}),
      height: 840,
      delivery: { width: 1600, height: 840 },
      captions: false,
    }).success,
    true,
  );
}

function _assertFeatureAcceptsTimelineEndpoints({
  feature,
  horizon,
}: Readonly<FeatureTimelineParams>): void {
  assert.equal(
    storyboardSchema.safeParse(
      _makeFilm({
        feature,
        durationInFrames: horizon,
      }),
    ).success,
    true,
    feature,
  );
  assert.equal(
    storyboardSchema.safeParse(
      _makeFilm({
        feature,
        durationInFrames: 1,
        fromFrame: horizon - 1,
      }),
    ).success,
    true,
    feature,
  );
}

function _assertFeatureRejectsTimelineOverflow({
  feature,
  horizon,
}: Readonly<FeatureTimelineParams>): void {
  assert.equal(
    storyboardSchema.safeParse(
      _makeFilm({
        feature,
        durationInFrames: horizon,
        fromFrame: 1,
      }),
    ).success,
    false,
    feature,
  );
  assert.equal(
    storyboardSchema.safeParse(
      _makeFilm({
        feature,
        durationInFrames: 1,
        fromFrame: horizon,
      }),
    ).success,
    false,
    feature,
  );
}

function _assertExplorerModeBounds({
  mode,
  horizon,
}: Readonly<{ mode: string; horizon: number }>): void {
  assert.equal(
    storyboardSchema.safeParse(
      _makeFilm({
        feature: "explorer",
        durationInFrames: horizon,
        fromFrame: 0,
        mode,
      }),
    ).success,
    true,
    mode,
  );
  assert.equal(
    storyboardSchema.safeParse(
      _makeFilm({
        feature: "explorer",
        durationInFrames: horizon,
        fromFrame: 1,
        mode,
      }),
    ).success,
    false,
    mode,
  );
}

function _assertNonExplorerRejectsMode(mode: string): void {
  assert.equal(
    storyboardSchema.safeParse(
      _makeFilm({
        feature: "map",
        durationInFrames: 100,
        fromFrame: 0,
        mode,
      }),
    ).success,
    false,
    mode,
  );
}

test("compiled components match current workspace source for every feature", async () => {
  const manifest: BuildManifest = await _readJson(
    "src/avandar/generated/build.json",
  );
  assert.equal(manifest.repository, "AvandarLabs/avandar");
  assert.match(manifest.revision, /^[a-f0-9]{40}$/);
  assert.ok(manifest.files.length > 0);
  const sourcePaths = new Set(manifest.files.map(prop("path")));
  assert.equal(sourcePaths.size, manifest.files.length);

  await Promise.all(manifest.files.map(_assertSourceFileBytes));
  _assertRequiredProductSurfaces(sourcePaths);
  await _assertBuiltProductMatchesManifest(manifest);
});

test("Avandar scenes enforce their authored feature, mode, stage and timeline bounds", () => {
  Array.from(
    Object.entries({
      import: 660,
      explorer: 800,
      dashboards: 720,
      cases: 660,
      map: 720,
    }),
  ).forEach(([feature, horizon]) => {
    _assertFeatureAcceptsTimelineEndpoints({ feature, horizon });
    _assertFeatureRejectsTimelineOverflow({ feature, horizon });
  });
  Array.from(
    Object.entries({
      filter: 300,
      query: 330,
      chart: 230,
    }),
  ).forEach(([mode, horizon]) => {
    _assertExplorerModeBounds({ mode, horizon });
    _assertNonExplorerRejectsMode(mode);
  });
  _assertInvalidStageAndCaptionConfigurations();
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
      await _readJson(`storyboards/${name}.json`),
    );
    assert.ok(
      plan.shots.every((shot) => {
        return shot.scene === "title" || shot.scene === "avandar";
      }),
      name,
    );
    const bodies = plan.shots.filter((shot) => {
      return shot.scene === "avandar";
    });
    assert.deepEqual(
      bodies.map(prop("props.feature")),
      name === "avandar-overview"
        ? ["import", "explorer", "dashboards"]
        : [name],
    );
    bodies.forEach((body) => {
      assert.equal(body.props.fromFrame, 0, name);
      assert.equal(body.props.mode, "full", name);
    });
  }
});
