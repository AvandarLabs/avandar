import assert from "node:assert/strict";
import test from "node:test";
import { continuityAppearanceSchema } from "../../continuityAppearance";
import { getExportOptionsFromAcknowledgement } from "./compositionExportOptions";

const DRAFT = continuityAppearanceSchema.parse({ cameraMotion: false });

test("a continuity study exports only the appearance its player acknowledged", () => {
  assert.equal(
    getExportOptionsFromAcknowledgement({
      id: "study",
      isScene: false,
      draft: DRAFT,
      acknowledged: { id: "study", options: { ...DRAFT, motionBlur: false } },
    }),
    undefined,
  );
  assert.deepEqual(
    getExportOptionsFromAcknowledgement({
      id: "study",
      isScene: false,
      draft: DRAFT,
      acknowledged: { id: "study", options: DRAFT },
    }),
    DRAFT,
  );
});

test("a scene study exports captions alone once its own player responds", () => {
  const sceneAcknowledgement = {
    id: "scene",
    options: continuityAppearanceSchema.parse({ captions: false }),
  };
  assert.deepEqual(
    getExportOptionsFromAcknowledgement({
      id: "scene",
      isScene: true,
      draft: DRAFT,
      acknowledged: sceneAcknowledgement,
    }),
    { captions: false },
  );
  assert.equal(
    getExportOptionsFromAcknowledgement({
      id: "other-scene",
      isScene: true,
      draft: DRAFT,
      acknowledged: sceneAcknowledgement,
    }),
    undefined,
  );
});
