import assert from "node:assert/strict";
import test from "node:test";
import { parseArgs } from "../scripts/video";

test("CLI rejects unknown or unsafe numeric options and requires manual-alignment inputs", () => {
  assert.throws(
    () => parseArgs(["render", "plan.json", "--skip-gate", "true"]),
    /Invalid/,
  );
  assert.throws(
    () => parseArgs(["align", "plan.json", "--audio", "voice.wav"]),
    /requires/,
  );
  assert.throws(
    () => parseArgs(["tts", "plan.json", "--rate", "175; touch unexpected"]),
    /rate/,
  );
  assert.equal(
    parseArgs(["tts", "plan.json", "--voice", "A voice name", "--rate", "190"])
      .voice,
    "A voice name",
  );
});
