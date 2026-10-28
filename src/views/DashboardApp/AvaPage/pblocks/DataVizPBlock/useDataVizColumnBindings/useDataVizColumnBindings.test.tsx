import { DataVizColumnBindingTestFixtures } from "./DataVizColumnBindingTestFixtures";
import type { QueryResultColumnBindingRegistry } from "$/models/queries/QueryResultColumnBindings/QueryResultColumnBindings.types";
import type { Workspace } from "$/models/Workspace/Workspace";

const {
  uuid,
  makeProjectionDescriptorsFromSql,
  reconcileQueryResultColumnBindings,
  applyDashboardFiltersToSql,
  makeColumnBindingsFromDashboardFilters,
  act,
  renderHook,
  waitFor,
  expect,
  it,
  useDataVizColumnBindings,
  runQuery,
  reportError,
  AUTH,
  DASHBOARD,
  OPTIONS,
  _createResult,
  _deferred,
  _createWrapper,
} = DataVizColumnBindingTestFixtures;

it("discovers unfiltered schema once while filter values change", async () => {
  const pending = _deferred();
  runQuery.mockReturnValue(pending.promise);
  const { result, rerender } = renderHook(
    ({ value }) => {
      const bindings = useDataVizColumnBindings(OPTIONS);
      const filters = [
        {
          filterId: "region",
          columnName: "region",
          label: "Region",
          operator: "equals" as const,
          value,
        },
      ];
      const resolved =
        bindings.status === "ready"
          ? makeColumnBindingsFromDashboardFilters({
              filters,
              targets: {},
              columns: bindings.schema!.columns,
            })
          : undefined;
      return {
        bindings,
        sql: resolved
          ? applyDashboardFiltersToSql({
              sql: OPTIONS.rawSql,
              filters: resolved.resolvedFilters,
            })
          : undefined,
      };
    },
    { wrapper: _createWrapper(), initialProps: { value: "North" } },
  );
  expect(result.current.bindings.status).toBe("loading");
  expect(result.current.sql).toBeUndefined();
  await act(async () => {
    pending.resolve(_createResult());
  });
  await waitFor(() => {
    return expect(result.current.bindings.status).toBe("ready");
  });
  expect(result.current.sql).toContain(`"region" = 'North'`);
  expect(runQuery).toHaveBeenCalledWith(
    expect.objectContaining({
      ...AUTH,
      rawSql:
        'SELECT * FROM (SELECT region FROM sales) AS "_ava_schema" LIMIT 0',
    }),
  );
  rerender({ value: "South" });
  expect(result.current.sql).toContain(`"region" = 'South'`);
  expect(runQuery).toHaveBeenCalledTimes(1);
});

it("shares one discovery and identical output IDs across render and settings consumers", async () => {
  const wrapper = _createWrapper();
  const first = renderHook(
    () => {
      return useDataVizColumnBindings(OPTIONS);
    },
    { wrapper },
  );
  const second = renderHook(
    () => {
      return useDataVizColumnBindings({
        ...OPTIONS,
        rawSql: "SELECT region FROM sales",
      });
    },
    { wrapper },
  );
  await waitFor(() => {
    return expect(first.result.current.status).toBe("ready");
  });
  await waitFor(() => {
    return expect(second.result.current.status).toBe("ready");
  });
  expect(first.result.current.schema).toEqual(second.result.current.schema);
  expect(runQuery).toHaveBeenCalledTimes(1);
  expect(first.result.current.schema?.registry.scopeKey).toBe("block-a");
});

it("ignores a late old-query result after the new schema is ready", async () => {
  const old = _deferred();
  runQuery
    .mockReturnValueOnce(old.promise)
    .mockResolvedValueOnce(_createResult("territory"));
  const { result, rerender } = renderHook(
    ({ rawSql }) => {
      return useDataVizColumnBindings({ ...OPTIONS, rawSql });
    },
    {
      wrapper: _createWrapper(),
      initialProps: { rawSql: "SELECT region FROM sales" },
    },
  );
  rerender({ rawSql: "SELECT region AS territory FROM sales" });
  expect(result.current.schema).toBeUndefined();
  await waitFor(() => {
    return expect(result.current.status).toBe("ready");
  });
  const current = result.current.schema;
  await act(async () => {
    old.resolve(_createResult());
  });
  expect(result.current.schema).toBe(current);
  expect(result.current.schema?.columns[0]?.name).toBe("territory");
});

it("does not expose old schema while a changed query fails discovery", async () => {
  runQuery
    .mockResolvedValueOnce(_createResult())
    .mockRejectedValueOnce(new Error("schema read failed"));
  const { result, rerender } = renderHook(
    ({ rawSql }) => {
      return useDataVizColumnBindings({ ...OPTIONS, rawSql });
    },
    {
      wrapper: _createWrapper(),
      initialProps: { rawSql: "SELECT region FROM sales" },
    },
  );
  await waitFor(() => {
    return expect(result.current.status).toBe("ready");
  });
  rerender({ rawSql: "SELECT missing FROM sales" });
  expect(result.current.schema).toBeUndefined();
  await waitFor(() => {
    return expect(result.current.status).toBe("error");
  });
  expect(result.current.schema).toBeUndefined();
  expect(result.current.error?.message).toBe("schema read failed");
  expect(reportError).toHaveBeenCalledWith(
    expect.objectContaining({ message: "schema read failed" }),
  );
});

it.each([
  { auth: "workspace" as const, workspaceId: uuid<Workspace.Id>() },
  {
    auth: "public" as const,
    publicAvaPageId: DASHBOARD,
    snapshotRevision: "revision-1",
  },
  {
    auth: "workspace_published" as const,
    publicAvaPageId: DASHBOARD,
    snapshotRevision: "revision-1",
  },
])("uses $auth auth without persisting the runtime scope", async (auth) => {
  const { result } = renderHook(
    () => {
      return useDataVizColumnBindings({ ...OPTIONS, auth });
    },
    { wrapper: _createWrapper() },
  );
  await waitFor(() => {
    return expect(result.current.status).toBe("ready");
  });
  expect(runQuery).toHaveBeenCalledWith(expect.objectContaining(auth));
  expect(result.current.schema?.registry.scopeKey).toBe("block-a");
});

it("isolates cache entries by auth mode, revision, workspace, block, and query", async () => {
  const variants = [
    {
      ...OPTIONS,
      auth: {
        auth: "public" as const,
        publicAvaPageId: DASHBOARD,
        snapshotRevision: "1",
      },
    },
    {
      ...OPTIONS,
      auth: {
        auth: "workspace_published" as const,
        publicAvaPageId: DASHBOARD,
        snapshotRevision: "1",
      },
    },
    {
      ...OPTIONS,
      auth: {
        auth: "workspace_published" as const,
        publicAvaPageId: DASHBOARD,
        snapshotRevision: "2",
      },
    },
    OPTIONS,
    {
      ...OPTIONS,
      auth: { auth: "workspace" as const, workspaceId: uuid<Workspace.Id>() },
    },
    { ...OPTIONS, scopeKey: "block-b" },
    { ...OPTIONS, rawSql: "SELECT region FROM other_sales" },
  ];
  const { result, rerender } = renderHook(
    (options) => {
      return useDataVizColumnBindings(options);
    },
    { wrapper: _createWrapper(), initialProps: variants[0]! },
  );
  for (const [index, options] of variants.entries()) {
    rerender(options);
    await waitFor(() => {
      return expect(result.current.status).toBe("ready");
    });
    expect(runQuery).toHaveBeenCalledTimes(index + 1);
  }
});

it("retains a persisted region ID through a supported SQL alias edit", async () => {
  const sql = "SELECT region FROM sales";
  const columns = _createResult().columns;
  const previous = reconcileQueryResultColumnBindings({
    scopeKey: "block-a",
    sqlKey: sql,
    columns,
    projections: makeProjectionDescriptorsFromSql({ sql, columns }),
    previous: undefined,
  });
  runQuery.mockResolvedValue(_createResult("territory"));
  const { result } = renderHook(
    () => {
      return useDataVizColumnBindings({
        ...OPTIONS,
        rawSql: "SELECT region AS territory FROM sales",
        initialRegistry: previous.registry,
      });
    },
    { wrapper: _createWrapper() },
  );
  await waitFor(() => {
    return expect(result.current.status).toBe("ready");
  });
  expect(result.current.schema?.columns[0]).toMatchObject({
    id: previous.columns[0]!.id,
    name: "territory",
  });
  expect(result.current.schema?.registry.sqlKey).toBe(
    "SELECT region AS territory FROM sales",
  );
});

it("rediscovers when a saved registry belongs to another block", async () => {
  const registry: QueryResultColumnBindingRegistry = {
    version: 1,
    scopeKey: "other-block",
    sqlKey: "SELECT region FROM sales",
    columns: [],
  };
  const { result } = renderHook(
    () => {
      return useDataVizColumnBindings({
        ...OPTIONS,
        initialRegistry: registry,
      });
    },
    { wrapper: _createWrapper() },
  );
  expect(result.current.status).toBe("loading");
  await waitFor(() => {
    return expect(result.current.status).toBe("ready");
  });
  expect(result.current.schema?.columns[0]?.name).toBe("region");
  expect(runQuery).toHaveBeenCalledTimes(1);
});

it("shares stable new output IDs when a changed opaque query has a stale registry", async () => {
  const registry: QueryResultColumnBindingRegistry = {
    version: 1,
    scopeKey: "block-a",
    sqlKey: "SELECT old",
    columns: [],
  };
  const options = {
    ...OPTIONS,
    rawSql: "SELECT 'North' AS region UNION ALL SELECT 'South'",
    initialRegistry: registry,
  };
  const wrapper = _createWrapper();
  const first = renderHook(
    ({ value }) => {
      return { value, bindings: useDataVizColumnBindings(options) };
    },
    { wrapper, initialProps: { value: "North" } },
  );
  const second = renderHook(
    () => {
      return useDataVizColumnBindings(options);
    },
    {
      wrapper,
    },
  );
  await waitFor(() => {
    return expect(first.result.current.bindings.status).toBe("ready");
  });
  await waitFor(() => {
    return expect(second.result.current.status).toBe("ready");
  });
  const columnId = first.result.current.bindings.schema?.columns[0]?.id;
  expect(second.result.current.schema?.columns[0]?.id).toBe(columnId);
  first.rerender({ value: "South" });
  expect(first.result.current.bindings.schema?.columns[0]?.id).toBe(columnId);
  expect(runQuery).toHaveBeenCalledTimes(1);
});

it("revalidates persisted empty metadata before enabling predicates", async () => {
  const registry: QueryResultColumnBindingRegistry = {
    version: 1,
    scopeKey: "block-a",
    sqlKey: "SELECT region FROM sales",
    columns: [],
  };
  const { result, rerender } = renderHook(
    ({ rawSql }) => {
      return useDataVizColumnBindings({
        ...OPTIONS,
        initialRegistry: registry,
        rawSql,
      });
    },
    { wrapper: _createWrapper(), initialProps: { rawSql: OPTIONS.rawSql } },
  );
  expect(result.current.status).toBe("loading");
  expect(result.current.schema).toBeUndefined();
  await waitFor(() => {
    return expect(result.current.schema?.columns[0]?.name).toBe("region");
  });
  rerender({ rawSql: "SELECT region FROM other_sales" });
  expect(result.current.status).toBe("loading");
  await waitFor(() => {
    return expect(result.current.status).toBe("ready");
  });
  expect(runQuery).toHaveBeenCalledTimes(2);
});
