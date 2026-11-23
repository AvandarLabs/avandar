import { expect, it } from "vitest";
import { uuid } from "$/lib/uuid";
import { makeLocalFilterColumnBindingsFromLocalFilters } from "./makeLocalFilterColumnBindingsFromLocalFilters";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";

it("omits a deleted local ID without substituting a same-named QueryResult column", () => {
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

it("reports a saved local filter on a list column instead of applying it", () => {
  const columnId = uuid<QueryColumn.Id>();
  const result = makeLocalFilterColumnBindingsFromLocalFilters({
    filters: [
      {
        id: "local",
        columnId,
        label: "symptoms",
        mode: "select_multi",
        optionsRaw: "",
        defaultValue: "",
      },
    ],
    valuesById: { local: ["Fever"] },
    columns: [
      { id: columnId, name: "Symptoms", dataType: "varchar", isArray: true },
    ],
  });
  expect(result.resolvedFilters).toEqual([]);
  expect(result.issues).toEqual([{ target: "local", reason: "unsupported" }]);
});
