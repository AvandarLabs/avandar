import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { parse } from "yaml";
import { parseStockMetadata } from "./parseStockMetadata";

test("authored YAML retains copy IDs and descriptive metadata", async () => {
  const source = parse(
    await readFile(
      new URL(
        "../../presets/MetricCounter/MetricCounter.metadata.yaml",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  const metadata = parseStockMetadata(source);
  assert.deepEqual(metadata, source);
  assert.equal(metadata.name.id, "motionAtlas.metric-counter.name");
  assert.ok(metadata.goodFor.length > 0);
  assert.ok(metadata.tags.length > 0);
  assert.ok(metadata.creativeDirection.message.length > 0);
});

test("invalid YAML metadata fails validation instead of entering the catalog", async () => {
  const source = parse(
    await readFile(
      new URL(
        "../../presets/MetricCounter/MetricCounter.metadata.yaml",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  assert.throws(() => {
    return parseStockMetadata({ ...source, creativeDirection: undefined });
  });
  assert.throws(() => {
    return parseStockMetadata({ ...source, tags: ["untyped tag"] });
  });
  assert.throws(() => {
    return parseStockMetadata({ ...source, goodFor: [] });
  });
  assert.throws(() => {
    return parseStockMetadata({
      ...source,
      name: { id: "", message: "Title" },
    });
  });
  assert.throws(() => {
    return parseStockMetadata({
      ...source,
      creativeDiretion: source.creativeDirection,
    });
  });
});
