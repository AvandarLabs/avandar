import assert from "node:assert/strict";
import test from "node:test";
import { stockI18n } from "../stockI18n/stockI18n";
import { getStockDisplayCopyFromDescriptor } from "./getStockDisplayCopyFromDescriptor";

test("translated count templates reorder complete units and preserve inserted strings literally", () => {
  const descriptor = {
    id: "test.display.count",
    message: "{count} items for {name}",
  };
  stockI18n.load("template-test", {
    [descriptor.id]: ["{name}: {count} things"],
  });
  stockI18n.activate("template-test");
  try {
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
      () =>
        getStockDisplayCopyFromDescriptor({ descriptor, values: { count: 1 } }),
      /Missing display-copy value/,
    );
  } finally {
    stockI18n.activate("en");
  }
});
