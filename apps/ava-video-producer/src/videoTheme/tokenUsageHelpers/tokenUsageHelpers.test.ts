import assert from "node:assert/strict";
import test from "node:test";
import { SEMANTIC_TOKENS } from "../tokenCatalog/semanticTokens/semanticTokens";
import {
  createTokenUsageCollector,
  createTokenUsageProxy,
} from "./tokenUsageHelpers";

test("reading a token through the proxy reports its path once", () => {
  const collector = createTokenUsageCollector();
  const tokens = createTokenUsageProxy({
    value: { color: { accent: "#51a7ff", ground: "#0b1219" } },
    catalog: SEMANTIC_TOKENS,
    basePath: [],
    report: collector.report,
  });
  void tokens.color.accent;
  void tokens.color.accent;
  assert.deepEqual(collector.getPaths(), ["color.accent"]);
});

test("reading a field of a composite token reports the token, not the field", () => {
  const collector = createTokenUsageCollector();
  const tokens = createTokenUsageProxy({
    value: { text: { stage: { heading: { fontSize: 48 } } } },
    catalog: SEMANTIC_TOKENS,
    basePath: [],
    report: collector.report,
  });
  void tokens.text.stage.heading.fontSize;
  assert.deepEqual(collector.getPaths(), ["text.stage.heading"]);
});
