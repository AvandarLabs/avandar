import assert from "node:assert/strict";
import test from "node:test";
import { getStockDisplayCopyFromDescriptor } from "./getStockDisplayCopyFromDescriptor";

test("count templates insert complete units and preserve inserted strings literally", () => {
  const descriptor = {
    id: "test.display.count",
    message: "{name}: {count} things",
  };
  assert.equal(
    getStockDisplayCopyFromDescriptor({
      descriptor,
      values: { name: "{count}", count: "07" },
    }),
    "{count}: 07 things",
  );
  assert.equal(
    getStockDisplayCopyFromDescriptor({
      descriptor,
      values: { name: "", count: 0 },
    }),
    ": 0 things",
  );
  assert.throws(
    () => getStockDisplayCopyFromDescriptor({ descriptor, values: { count: 1 } }),
    /Missing display-copy value/,
  );
});
