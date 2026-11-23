import assert from "node:assert/strict";
import test from "node:test";
import { parseArgs } from "./parseArgs";

test("CLI rejects unknown or unsafe numeric options and requires manual-alignment inputs", () => {
  assert.throws(() => {
    return parseArgs(["render", "plan.json", "--skip-gate", "true"]);
  }, /Invalid/);
  assert.throws(() => {
    return parseArgs(["align", "plan.json", "--audio", "voice.wav"]);
  }, /requires/);
  assert.throws(() => {
    return parseArgs(["tts", "plan.json", "--rate", "175; touch unexpected"]);
  }, /rate/);
  assert.equal(
    parseArgs(["tts", "plan.json", "--voice", "A voice name", "--rate", "190"])
      .voice,
    "A voice name",
  );
});

test("preview and render accept one theme", () => {
  assert.equal(
    parseArgs(["preview", "plan.json", "--theme", "avandar"]).theme,
    "avandar",
  );
  assert.equal(
    parseArgs(["render", "plan.json", "--theme", "classic"]).theme,
    "classic",
  );
});

test("commands that draw no picture refuse a theme", () => {
  assert.throws(() => {
    return parseArgs(["validate", "plan.json", "--theme", "avandar"]);
  }, /Invalid/);
});
