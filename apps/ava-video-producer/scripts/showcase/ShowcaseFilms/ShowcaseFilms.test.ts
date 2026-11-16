import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";
import { createContinuityPlanFromVideoThemeSnapshot } from "../../../src/continuity/createContinuityPlanFromVideoTheme/createContinuityPlanFromVideoTheme";
import { DECISION_FORK_DENSE_INPUT } from "../../../src/stock/presets/DecisionFork/DecisionFork.fixtures";
import { DRAFT_THEME_ID } from "../../../src/videoTheme/createDraftThemeTarget/createDraftThemeTarget";
import { makeResolvedVideoThemeFromSnapshot } from "../../../src/videoTheme/videoThemeSnapshotHelpers/videoThemeSnapshotHelpers";
import { appRoot, ShowcaseFilms } from "../ShowcaseFilms/ShowcaseFilms";

test("unknown IDs and unsafe render options cannot become render inputs", async () => {
  await assert.rejects(ShowcaseFilms.load("../.env.local"));
  await assert.rejects(
    ShowcaseFilms.load("stock-plexus-field", {
      accent: "url(https://example.com)",
    }),
  );
  await assert.rejects(
    ShowcaseFilms.load("avandar-home", { background: "#ffffff" }),
  );
});

test("stock downloads carry the selected palette into the composition", async () => {
  const film = await ShowcaseFilms.load("stock-plexus-field", {
    accent: "#ff0000",
    background: "#ffffff",
  });
  assert.equal(film.kind, "stock");
  assert.equal(film.accent, "#ff0000");
  assert.equal(film.background, "#ffffff");
  assert.equal(film.frames, 180);
});

test("homepage captions can be hidden without changing product stage geometry", async () => {
  const film = await ShowcaseFilms.load("avandar-home", { captions: false });
  assert.equal(film.plan?.captions, true);
  assert.equal(film.showCaptions, false);
  assert.equal(film.frames, 590);
  assert.equal(film.source, "apps/ava-video-producer/storyboards/home.json");
});

/**
 * Copies the app sources the film catalog imports, so tests can edit the
 * copy without touching this worktree.
 */
async function _copyCatalogSources(root: string): Promise<void> {
  await Promise.all(
    ["scripts", "src", "themes"].map((directory) =>
      fs.cp(path.join(appRoot, directory), path.join(root, directory), {
        recursive: true,
        // Skips generated product bundles, which the catalog never imports.
        filter: (source) => !source.includes(`${path.sep}generated${path.sep}`),
      }),
    ),
  );
}

async function _withCatalogCopy(
  action: (
    root: string,
    load: typeof ShowcaseFilms.load,
    retain: typeof ShowcaseFilms.retainContracts,
    fingerprint: typeof ShowcaseFilms.getFingerprintFromFilm,
  ) => Promise<void>,
) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "showcase-catalog-"));
  try {
    await _copyCatalogSources(root);
    await fs.writeFile(
      path.join(root, "package.json"),
      JSON.stringify({ type: "module" }),
    );
    await fs.symlink(
      path.join(appRoot, "node_modules"),
      path.join(root, "node_modules"),
    );
    await fs.writeFile(
      path.join(root, "src/composition-timing.ts"),
      "export const TITLE_LEN=12; export const TITLE_STUDY_LEN=90; export const MOTION_LAB_LEN=42;",
    );
    const catalog: typeof import("./ShowcaseFilms") = await import(
      pathToFileURL(
        path.join(root, "scripts/showcase/ShowcaseFilms/ShowcaseFilms.ts"),
      ).href
    );
    await action(
      root,
      catalog.ShowcaseFilms.load,
      catalog.ShowcaseFilms.retainContracts,
      catalog.ShowcaseFilms.getFingerprintFromFilm,
    );
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}

test("stock exports use edited source duration without restarting the catalog", async () => {
  await _withCatalogCopy(async (root, load) => {
    assert.equal((await load("stock-plexus-field")).frames, 180);
    const input = structuredClone(DECISION_FORK_DENSE_INPUT);
    input.branches[1].outcome = "Persisted author result";
    const originalFilm = await load("stock-decision-fork", {
      input,
      schemaVersion: 1,
      accent: "#aabbcc",
      background: "#112233",
    });
    const filename = path.join(root, "src/stock/catalog.ts");
    const source = await fs.readFile(filename, "utf8");
    await fs.writeFile(
      filename,
      source.replace("loopFrames: contract.loopFrames", "loopFrames: 240"),
    );
    assert.equal((await load("stock-plexus-field")).frames, 240);
    const refreshedFilm = await load("stock-decision-fork", {
      input,
      schemaVersion: 1,
      accent: "#aabbcc",
      background: "#112233",
    });
    assert.equal(refreshedFilm.frames, 240);
    assert.deepEqual(refreshedFilm.input, originalFilm.input);
    assert.equal(refreshedFilm.accent, "#aabbcc");
    assert.equal(refreshedFilm.background, "#112233");
    assert.equal(refreshedFilm.schemaVersion, 1);
  });
});

test("fixed film durations follow edited shared timing without restarting", async () => {
  await _withCatalogCopy(async (root, load) => {
    assert.equal((await load("title-study")).frames, 90);
    assert.equal((await load("motion-lab")).frames, 54);
    await fs.writeFile(
      path.join(root, "src/composition-timing.ts"),
      "export const TITLE_LEN=24; export const TITLE_STUDY_LEN=120; export const MOTION_LAB_LEN=66;",
    );
    assert.equal((await load("title-study")).frames, 120);
    assert.equal((await load("motion-lab")).frames, 90);
  });
});

test("configured stock exports retain the exact input, version and palette", async () => {
  const input = structuredClone(DECISION_FORK_DENSE_INPUT);
  input.branches[1].outcome = "Author approved result";
  const film = await ShowcaseFilms.load("stock-decision-fork", {
    schemaVersion: 1,
    input,
    accent: "#aabbcc",
    background: "#112233",
  });
  assert.equal(film.preset, "decision-fork");
  if (film.kind !== "stock" || film.preset !== "decision-fork") {
    throw new Error("Expected decision fork");
  }
  assert.equal(film.schemaVersion, 1);
  assert.deepEqual(film.input, input);
  assert.equal(film.accent, "#aabbcc");
  assert.equal(film.background, "#112233");
});

test("non-stock films reject input and schema version options", async () => {
  await assert.rejects(ShowcaseFilms.load("title-study", { input: {} }));
  await assert.rejects(ShowcaseFilms.load("motion-lab", { schemaVersion: 1 }));
});

test("an export snapshot stays fixed after the editor draft changes", async () => {
  const input = structuredClone(DECISION_FORK_DENSE_INPUT);
  const film = await ShowcaseFilms.load("stock-decision-fork", { input });
  input.branches[1].outcome = "Edited after export";
  if (film.kind !== "stock" || film.preset !== "decision-fork") {
    throw new Error("Expected decision fork");
  }
  assert.equal(film.input?.branches[1].outcome, "Return to the notebook");
  assert.ok(Object.isFrozen(film.input));
  assert.ok(Object.isFrozen(film.input?.branches));
  assert.ok(Object.isFrozen(film.input?.branches[1]));
});

test("a supplied incomplete stock input fails instead of borrowing sample fields", async () => {
  await assert.rejects(
    ShowcaseFilms.load("stock-decision-fork", {
      input: { prompt: "Only a prompt" },
    }),
    /branches/,
  );
  await assert.rejects(
    ShowcaseFilms.load("stock-decision-fork", {
      input: DECISION_FORK_DENSE_INPUT,
      schemaVersion: 2,
    }),
  );
});

test("nested default and schema edits refresh together while frozen films retain their original content", async () => {
  await _withCatalogCopy(async (root, load, retain, fingerprint) => {
    const original = await load("stock-decision-fork");
    const release = retain(original);
    const dense = await load("stock-decision-fork", {
      input: DECISION_FORK_DENSE_INPUT,
    });
    const fixtures = path.join(
      root,
      "src/stock/presets/DecisionFork/DecisionFork.fixtures.ts",
    );
    await fs.writeFile(
      fixtures,
      (await fs.readFile(fixtures, "utf8")).replace(
        "Where does the fictional sketch belong?",
        "An edited complete fictional default",
      ),
    );
    const schema = path.join(
      root,
      "src/stock/presets/DecisionFork/DecisionFork.schema.ts",
    );
    await fs.writeFile(
      schema,
      (await fs.readFile(schema, "utf8")).replace(
        "z.array(decisionForkBranchSchema).min(2).max(4)",
        "z.array(decisionForkBranchSchema).min(2).max(3)",
      ),
    );
    await assert.rejects(fingerprint(original), /changed during/);
    const current = await load("stock-decision-fork");
    await fingerprint(current);
    assert.equal(
      (await fs.readdir(path.join(root, "out/showcase/contracts"))).length,
      2,
    );
    await release();
    assert.equal(
      (await fs.readdir(path.join(root, "out/showcase/contracts"))).length,
      1,
    );
    assert.equal(
      (current.input as { prompt: string }).prompt,
      "An edited complete fictional default",
    );
    await assert.rejects(
      load("stock-decision-fork", { input: DECISION_FORK_DENSE_INPUT }),
      /branches/,
    );
    assert.equal(
      (original.input as { prompt: string }).prompt,
      "Where does the fictional sketch belong?",
    );
    assert.equal((dense.input as { branches: unknown[] }).branches.length, 4);
    await assert.rejects(load("stock-decision-fork", { arbitrary: true }));
  });
});

test("explainer caption selection preserves the overlap-aware film duration", async () => {
  const film = await ShowcaseFilms.load("qetl-motion", { captions: false });
  assert.equal(film.kind, "storyboard");
  assert.equal(film.showCaptions, false);
  assert.equal(film.plan?.captions, true);
  assert.equal(film.frames, 1542);
  assert.equal(film.loop, false);
});

test("continuity appearance options preserve the timeline", async () => {
  const original = await ShowcaseFilms.load("qetl-motion");
  const film = await ShowcaseFilms.load("qetl-motion", {
    theme: {
      id: "classic",
      patch: {
        other: { video: { atomic: { swatch: { ground: "#ffffff" } } } },
      },
    },
    cameraMotion: false,
    motionBlur: false,
    annotations: false,
  });
  assert.equal(film.frames, original.frames);
  assert.deepEqual(film.plan?.narration, original.plan?.narration);
  const shot = film.plan?.shots.find(
    (candidate) => candidate.scene === "continuity",
  );
  assert.equal(shot?.scene === "continuity" && "accent" in shot.props, false);
  assert.equal(shot?.scene === "continuity" && shot.props.cameraMotion, false);
  const theme = makeResolvedVideoThemeFromSnapshot(film.theme, [film.id]);
  assert.equal(theme.semantic.color.ground, "#ffffff");
  await assert.rejects(
    ShowcaseFilms.load("avandar-home", { cameraMotion: false }),
  );
});

test("camera preset exports include the complete extended timeline", async () => {
  const original = await ShowcaseFilms.load("shared-object-handoff");
  const adjusted = await ShowcaseFilms.load("shared-object-handoff", {
    theme: {
      id: "classic",
      patch: {
        other: { video: { semantic: { camera: { preset: "deliberate" } } } },
      },
    },
  });
  assert.ok(adjusted.frames > original.frames);
  const drawn = createContinuityPlanFromVideoThemeSnapshot(
    adjusted.plan!,
    adjusted.theme,
    [adjusted.id],
  );
  assert.equal(
    adjusted.frames,
    drawn.shots.reduce((total, shot) => total + shot.durationInFrames, 0),
  );
  const shot = drawn.shots[0];
  assert.equal(
    shot.scene === "continuity" &&
      shot.props.beats[0].content.kind === "stock" &&
      shot.props.beats[0].content.cameraOptions?.speed,
    0.25,
  );
  await assert.rejects(
    ShowcaseFilms.load("shared-object-handoff", {
      theme: {
        id: "classic",
        patch: {
          other: { video: { semantic: { camera: { preset: "fast" } } } },
        },
      },
    }),
  );
});

test("continuity films refuse colour options; colours come from the theme", async () => {
  await assert.rejects(
    ShowcaseFilms.load("shared-object-handoff", { accent: "#ff0000" }),
    /theme/,
  );
});

test("a film without a theme option carries the classic snapshot", async () => {
  const film = await ShowcaseFilms.load("occlusion-wipe");
  assert.deepEqual(film.theme, {
    themeId: "classic",
    documents: [],
    patches: [],
  });
});

test("a draft on a built-in theme renders as the unsaved theme that extends it", async () => {
  const patch = {
    other: { video: { atomic: { swatch: { ground: "#201510" } } } },
  };
  const film = await ShowcaseFilms.load("stock-network-graph", {
    theme: { id: "avandar", patch },
  });
  assert.equal(film.theme?.themeId, DRAFT_THEME_ID);
  assert.deepEqual(
    film.theme?.documents.map((document) => document.extends),
    ["avandar"],
  );
  assert.deepEqual(film.theme?.patches, [patch]);
});

test("a stock film keeps its theme out of the stock request", async () => {
  const film = await ShowcaseFilms.load("stock-network-graph", {
    theme: { id: "avandar" },
  });
  assert.equal(film.kind === "stock" && film.preset, "network-graph");
});

test("an unknown theme is refused", async () => {
  await assert.rejects(
    ShowcaseFilms.load("occlusion-wipe", { theme: { id: "missing" } }),
  );
});

test("a continuity film keeps its theme out of the appearance options", async () => {
  const film = await ShowcaseFilms.load("qetl-motion", {
    theme: { id: "avandar" },
  });
  assert.equal(film.theme?.themeId, "avandar");
});

test("an empty draft patch on a built-in theme still renders as the unsaved theme", async () => {
  const film = await ShowcaseFilms.load("stock-network-graph", {
    theme: { id: "avandar", patch: {} },
  });
  assert.equal(film.theme?.themeId, DRAFT_THEME_ID);
});
