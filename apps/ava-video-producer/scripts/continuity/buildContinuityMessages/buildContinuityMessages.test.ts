import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { setupI18n } from "@lingui/core";
import { CONTINUITY_CATALOG } from "../../../src/continuity/continuityCatalog";
import { continuityCatalogs } from "../../../src/continuity/i18n/catalogs.generated";
import { getContinuityCopyFromMessage } from "../../../src/continuity/i18n/getContinuityCopyFromMessage/getContinuityCopyFromMessage";
import { sourceMessages } from "../../../src/continuity/i18n/sourceMessages.generated";
import { storyboardSchema } from "../../../src/storyboard/schema/schema";
import { collectContinuityMessages } from "../collectContinuityMessages/collectContinuityMessages";

function _assertMessage(message: string) {
  const id = `continuity.${message}`;
  assert.equal(sourceMessages[id], message);
  assert.ok(Object.hasOwn(continuityCatalogs.en, id), id);
}

test("generated catalogs cover every authored heading, token, thesis and diagram label", async () => {
  const root = process.cwd();
  const files = (
    await fs.readdir(path.join(root, "storyboards/explainers"))
  ).filter((file) => file.endsWith(".json"));
  await Promise.all(
    files.map(async (file) => {
      const plan = storyboardSchema.parse(
        JSON.parse(
          await fs.readFile(
            path.join(root, "storyboards/explainers", file),
            "utf8",
          ),
        ),
      );
      _assertMessage(plan.title);
      plan.narration.forEach((cue) => _assertMessage(cue.text));
      plan.shots.forEach((shot) => {
        if (shot.scene !== "continuity") {
          return;
        }
        _assertMessage(shot.props.title);
        _assertMessage(shot.props.evidence);
        shot.props.beats.forEach((beat) => {
          _assertMessage(beat.title);
          _assertMessage(beat.subtitle);
          if (beat.token) {
            _assertMessage(beat.token.label);
          }
          if (beat.content.kind === "thesis") {
            [...beat.content.lines, beat.content.emphasis].forEach(
              _assertMessage,
            );
          }
          if (beat.content.kind === "composite") {
            beat.content.diagrams.forEach((diagram) => {
              _assertMessage(diagram.label);
              if ("detail" in diagram && typeof diagram.detail === "string") {
                _assertMessage(diagram.detail);
              }
            });
          }
        });
      });
    }),
  );
});

test("generated catalogs cover reusable guidance and statically selected gallery labels", async () => {
  CONTINUITY_CATALOG.forEach((entry) => {
    _assertMessage(entry.title);
    _assertMessage(entry.description);
    if (entry.family === "vocabulary") {
      _assertMessage(entry.goodFor);
      _assertMessage(entry.creativeDirection);
      entry.tags.forEach(_assertMessage);
      _assertMessage(entry.avoid);
      entry.controls.forEach((control) => {
        _assertMessage(control.label);
        _assertMessage(control.description);
      });
    }
  });
  [
    "Composition Atlas",
    "Loading preview…",
    "Preparing export…",
    "Composition recipes",
    "Good for",
  ].forEach(_assertMessage);
  assert.deepEqual(
    await collectContinuityMessages(process.cwd()),
    sourceMessages,
  );
});

test("compiled English prose retains apostrophes and exact source text", () => {
  const i18n = setupI18n({ locale: "en", messages: { en: {} } });
  Object.values(sourceMessages).forEach((message) => {
    _assertMessage(message);
    assert.equal(getContinuityCopyFromMessage({ i18n, message }), message);
  });
});
