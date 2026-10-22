import { expect, it } from "vitest";
import { uuid } from "$/lib/uuid";
import { makeLocalFilterColumnBindingsFromLocalFilters } from "./makeLocalFilterColumnBindingsFromLocalFilters";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
it("omits a deleted local ID without substituting a same-named output", () => {
  const result = makeLocalFilterColumnBindingsFromLocalFilters({
    filters: [
      {
        id: "local",
        columnId: uuid<QueryColumn.Id>(),
        label: "region",
        mode: "contains",
        optionsRaw: "",
        defaultValue: "",
      },
    ],
    valuesById: { local: "North" },
    columns: [
      { id: uuid<QueryColumn.Id>(), name: "region", dataType: "varchar" },
    ],
  });
  expect(result.resolvedFilters).toEqual([]);
  expect(result.issues).toEqual([{ target: "local", reason: "missing" }]);
});
