import assert from "node:assert/strict";
import test from "node:test";
import { CaptionLayout } from "../CaptionLayout";
import { SceneGeometry } from "../SceneGeometry";
import { TextLayout } from "../TextLayout";
import type { CaptionCue } from "../../scenes.types";

test("metric formatting preserves fractional values, negatives, grouping, and zero", () => {
  assert.equal(
    TextLayout.formatMetric({
      value: 12345.678,
      precision: 2,
    }),
    "12,345.68",
  );
  assert.equal(
    TextLayout.formatMetric({
      value: -12.5,
      precision: 1,
    }),
    "-12.5",
  );
  assert.equal(
    TextLayout.formatMetric({
      value: -0.001,
      precision: 2,
    }),
    "0.00",
  );
  assert.equal(TextLayout.formatMetric({ value: 0 }), "0");
  assert.throws(() => {
    return TextLayout.formatMetric({ value: Infinity });
  }, /finite/);
  assert.throws(() => {
    return TextLayout.formatMetric({
      value: 1,
      precision: 7,
    });
  }, /precision/);
});

test("metric fitting reserves the complete stack on a compact captioned canvas", () => {
  const bounds = SceneGeometry.sceneBounds({
    width: 1600,
    height:
      800 -
      CaptionLayout.captionBand({
        cues: [{ text: "A short cue." }],
        width: 1600,
        height: 800,
      }),
    hasHeading: true,
  });
  const content = {
    label: "Reported households requiring an additional response contact",
    value: 240,
    detail:
      "Records include households awaiting contact and reported needs across all fictional districts.",
  };
  const fit = TextLayout.fitMetricContent({ ...bounds, ...content });
  const required =
    fit.label.lines.length * fit.label.fontSize * 1.22 +
    fit.numberHeight +
    fit.numberGap * 2 +
    fit.detail!.lines.length * fit.detail!.fontSize * 1.3 +
    fit.paddingY * 2 +
    2;
  assert.equal(bounds.height, 322);
  assert.ok(
    required <= bounds.height,
    `Metric stack needs ${required}px inside ${bounds.height}px`,
  );
  assert.ok(
    fit.label.fontSize >= 28 &&
      fit.detail!.fontSize >= 20 &&
      fit.numberSize >= 48,
  );
  assert.deepEqual(
    fit,
    TextLayout.fitMetricContent({ ...bounds, ...content }),
    "Sizing depends on complete content, never the current counter frame",
  );
  _assertMetricUnitsAndMinimumHeight({ bounds, content });
});

test("metric fitting preserves the spacious layout when the whole stack fits", () => {
  const bounds = SceneGeometry.sceneBounds({
    width: 1600,
    height: 840,
    hasHeading: true,
  });
  const fit = TextLayout.fitMetricContent({
    ...bounds,
    label: "Fictional cases in the bundle",
    value: 240,
    detail: "Generated deterministically across six districts",
  });
  assert.equal(fit.numberSize, 154);
  assert.equal(fit.label.fontSize, 42);
  assert.equal(fit.detail!.fontSize, 28);
  assert.equal(fit.paddingY, 50);
  assert.equal(fit.numberGap, 28);
});

test("typography wraps at word boundaries and resolves a stable readable size", () => {
  const fit = TextLayout.fitTextLines({
    lines: [
      "A clear explanation stays readable across the whole canvas",
      "Every word has a purpose",
    ],
    width: 1000,
    height: 400,
    requested: 92,
  });
  assert.ok(fit.fontSize >= 40 && fit.fontSize <= 92);
  assert.ok(fit.lines.length * fit.fontSize * 1.22 <= 400);
  assert.equal(
    fit.lines.join(" "),
    "A clear explanation stays readable across the whole canvas Every word has a purpose",
  );
  fit.lines.forEach((line) => {
    return assert.ok(TextLayout.textUnits(line) * fit.fontSize <= 1000);
  });
  assert.throws(() => {
    return TextLayout.fitTextLines({
      lines: ["W".repeat(100)],
      width: 200,
      height: 300,
      requested: 92,
    });
  }, /cannot fit legibly/);
});

test("media accepts only public-relative assets and crop rectangles inside the viewport", () => {
  assert.equal(
    CaptionLayout.safePublicPath("captures/demo/screen 01.png"),
    "captures/demo/screen 01.png",
  );
  [
    "https://example.com/a.png",
    "//example.com/a.png",
    "/tmp/a.png",
    "../secret",
    "a/../secret",
    "a/%2e%2e/secret",
    "a\\secret",
    "a.png?token=123",
    "a.png#anchor",
    "data:image/png,abc",
  ].forEach((path) => {
    assert.throws(() => {
      return CaptionLayout.safePublicPath(path);
    }, /public-relative/);
  });
  SceneGeometry.assertRect({
    rect: { x: 0.2, y: 0.1, width: 0.8, height: 0.9 },
    name: "crop",
  });
  assert.throws(() => {
    return SceneGeometry.assertRect({
      rect: { x: 0.8, y: 0, width: 0.3, height: 1 },
      name: "crop",
    });
  }, /inside/);
  assert.throws(() => {
    return SceneGeometry.assertRect({
      rect: { x: 0, y: 0, width: 0, height: 1 },
      name: "crop",
    });
  }, /nonempty/);
});

test("captions use exact half-open cue boundaries and reject overlap or duplicate ids", () => {
  const cues: CaptionCue[] = [
    { id: "a", startFrame: 10, endFrame: 40, text: "First cue" },
    { id: "b", startFrame: 40, endFrame: 80, text: "Second cue" },
  ];
  CaptionLayout.validateCaptions(cues);
  assert.equal(
    CaptionLayout.activeCaption({
      frame: 9,
      cues,
    }),
    undefined,
  );
  assert.equal(
    CaptionLayout.activeCaption({
      frame: 10,
      cues,
    })?.id,
    "a",
  );
  assert.equal(
    CaptionLayout.activeCaption({
      frame: 39,
      cues,
    })?.id,
    "a",
  );
  assert.equal(
    CaptionLayout.activeCaption({
      frame: 40,
      cues,
    })?.id,
    "b",
  );
  _assertCaptionEndAndValidation(cues);
});

test("the tallest caption reserves its full box, inset and clearance without resizing the scene", () => {
  // 180 characters is long enough to force the caption onto its tallest
  // wrapped layout (>= 3 lines) at this canvas width, which is the boundary
  // this test exercises.
  const text =
    "These fictional cases connect to visits, facilities, and districts so teams can inspect source records, compare reported needs, and see which households are still awaiting contact.";
  const long = CaptionLayout.captionGeometry({
    text,
    width: 1600,
    height: 1000,
  });
  assert.ok(long.lines.length >= 3);
  assert.equal(long.fontSize, 38);
  const band = CaptionLayout.captionBand({
    cues: [{ text: "Short cue." }, { text }],
    width: 1600,
    height: 1000,
  });
  const sceneBottom = 1000 - band;
  const captionTop = 1000 - long.bottom - long.boxHeight;
  assert.ok(captionTop - sceneBottom >= long.clearance);
  assert.ok(sceneBottom >= 640);
  assert.equal(
    band,
    CaptionLayout.captionBand({
      cues: [{ text }, { text: "Short cue." }],
      width: 1600,
      height: 1000,
    }),
  );
  _assertEmptyAndShortCaptionBands();
});

function _assertMetricUnitsAndMinimumHeight({
  bounds,
  content,
}: Readonly<{
  bounds: ReturnType<typeof SceneGeometry.sceneBounds>;
  content: Readonly<{ label: string; value: number; detail: string }>;
}>): void {
  const withUnit = TextLayout.fitMetricContent({
    ...bounds,
    ...content,
    unit: "households",
    from: -125.5,
    precision: 1,
  });
  assert.ok(
    withUnit.requiredHeight <= bounds.height && withUnit.unitSize >= 28,
  );
  assert.throws(() => {
    return TextLayout.fitMetricContent({ ...bounds, ...content, height: 100 });
  }, /cannot fit legibly/);
}

function _assertCaptionEndAndValidation(cues: readonly CaptionCue[]): void {
  assert.equal(
    CaptionLayout.activeCaption({
      frame: 80,
      cues: [...cues],
    }),
    undefined,
  );
  assert.throws(() => {
    return CaptionLayout.validateCaptions([
      { ...cues[0], endFrame: 41 },
      cues[1],
    ]);
  }, /overlap/);
  assert.throws(() => {
    return CaptionLayout.validateCaptions([cues[0], { ...cues[1], id: "a" }]);
  }, /Duplicate/);
}

function _assertEmptyAndShortCaptionBands(): void {
  assert.equal(
    CaptionLayout.captionBand({
      cues: [],
      width: 1600,
      height: 1000,
    }),
    0,
  );
  assert.equal(
    CaptionLayout.captionBand({
      cues: [{ text: "Short cue." }],
      width: 1600,
      height: 1000,
    }),
    160,
  );
}
