import { NO_CRAWL_METRICS } from "@etl/EtlEngine/crawlMetrics/crawlMetrics";
import { createEtlEngine } from "@etl/EtlEngine/createEtlEngine/createEtlEngine";
import { EtlRunFailedError } from "@etl/EtlEngine/EtlRunFailedError";
import { EtlRunOptionsError } from "@etl/EtlEngine/EtlRunOptionsError";
import { OutOfOrderConnectionError } from "@etl/EtlEngine/OutOfOrderConnectionError";
import { createInMemoryCheckpointStore } from "@etl/stores/InMemoryCheckpointStore/createInMemoryCheckpointStore";
import { createInMemoryListingsStore } from "@etl/stores/InMemoryListingsStore/createInMemoryListingsStore";
import { describe, expect, it } from "vitest";
import type {
  ApiResourceRelation,
  EtlClock,
  EtlEngineConfig,
  EtlRunOptions,
  EtlRunReport,
  EtlRunWindow,
  EtlScope,
  EtlStores,
} from "@etl/EtlEngine/EtlEngine.types";
import type {
  CheckpointStore,
  ListingsStore,
  StoredCheckpoint,
} from "@etl/stores/EtlStores.types";
import type { InMemoryCheckpointStore } from "@etl/stores/InMemoryCheckpointStore/createInMemoryCheckpointStore";
import type { InMemoryListingsStore } from "@etl/stores/InMemoryListingsStore/createInMemoryListingsStore";

type FakeConnection = Readonly<{
  id: string;
  modifiedAt: Date;
  relationCount: number;
}>;
type FakePage = readonly FakeConnection[];
type FakeDrive = Readonly<{
  key: string;
  pages: readonly FakePage[];
  failAtPage?: number;
  /** Pages for one scope, in place of `pages`. */
  pagesByScope?: Readonly<Record<string, readonly FakePage[]>>;
}>;
type Recorder = {
  events: string[];
  windows: Map<string, EtlRunWindow>;
  /** Each crawl's window, keyed `<drive>/<scope>`. */
  scopeWindows: Map<string, EtlRunWindow>;
  /** The id of each connection passed to `transform`, in call order. */
  transforms: string[];
  /** `<scope>:<connection id>` for each `transform` call, in order. */
  scopedTransforms: string[];
};
type FakeConfig = EtlEngineConfig<FakeDrive, FakeConnection, EtlScope>;

const PIPELINE_NAME = "fake-pipeline";

function _at(minute: number): Date {
  return new Date(Date.UTC(2026, 9, 1, 0, minute));
}

function _connection(
  id: string,
  minute: number,
  relationCount = 1,
): FakeConnection {
  return { id, modifiedAt: _at(minute), relationCount };
}

function _drive(
  key: string,
  pages: readonly FakePage[],
  failAtPage?: number,
): FakeDrive {
  return { key, pages, failAtPage };
}

function _recorder(): Recorder {
  return {
    events: [],
    windows: new Map(),
    scopeWindows: new Map(),
    transforms: [],
    scopedTransforms: [],
  };
}

/** A crawl's name in events: the drive key, plus `/<scope>` unless `all`. */
function _crawlLabel(drive: FakeDrive, scope: EtlScope): string {
  return scope.key === "all" ? drive.key : `${drive.key}/${scope.key}`;
}

async function* _yieldPages(args: {
  label: string;
  pages: readonly FakePage[];
  failAtPage: number | undefined;
  recorder: Recorder;
}): AsyncGenerator<FakePage> {
  try {
    // Sequential on purpose: the fake pages like a real source, one at a
    // time.
    for (const [index, page] of args.pages.entries()) {
      if (args.failAtPage === index) {
        throw new Error(`${args.label} failed`);
      }
      args.recorder.events.push(`${args.label}:page${index}`);
      yield page;
    }
  } finally {
    args.recorder.events.push(`${args.label}:closed`);
  }
}

function _relationsFor(connection: FakeConnection): ApiResourceRelation[] {
  return Array.from({ length: connection.relationCount }, (_, index) => {
    return {
      kind: "api_resource",
      externalDatasetId: connection.id,
      apiResourceId: `${connection.id}-r${index}`,
      apiResourceFormat: "CSV",
      displayName: `Dataset ${connection.id}`,
      externalOrganizationName: "Fake Org",
      sourceUpdatedAt: connection.modifiedAt,
      columns: [
        { name: "a", originalDataType: "text", castDataType: "VARCHAR" },
      ],
    };
  });
}

function _config(args: {
  drives: readonly FakeDrive[];
  recorder: Recorder;
  stores?: EtlStores;
  isIncremental?: boolean;
  supabase?: FakeConfig["supabase"];
  getDriveKey?: FakeConfig["getDriveKey"];
  transform?: FakeConfig["transform"];
  listScopes?: FakeConfig["listScopes"];
  clock?: EtlClock;
}): FakeConfig {
  return {
    name: PIPELINE_NAME,
    service: "socrata",
    supabase: args.supabase,
    output: {
      listingsTable: "data_catalog_listings",
      upsertListingsFunction:
        "rpc_data_catalog_listings__upsert_with_relation_columns",
      checkpointsTable: "pipeline_scope_checkpoints",
    },
    stores: args.stores,
    ...(args.clock === undefined ? {} : { clock: args.clock }),
    ...(args.listScopes === undefined ? {} : { listScopes: args.listScopes }),
    listDrives: () => {
      args.recorder.events.push("listDrives");
      return args.drives;
    },
    getDriveKey:
      args.getDriveKey ??
      ((drive) => {
        return drive.key;
      }),
    extract: ({ drive, scope, window }) => {
      const label = _crawlLabel(drive, scope);
      args.recorder.windows.set(drive.key, window);
      args.recorder.scopeWindows.set(`${drive.key}/${scope.key}`, window);
      return _yieldPages({
        label,
        pages: drive.pagesByScope?.[scope.key] ?? drive.pages,
        failAtPage: drive.failAtPage,
        recorder: args.recorder,
      });
    },
    getConnectionId: (connection) => {
      return connection.id;
    },
    transform: (transformArgs) => {
      const { connection, scope } = transformArgs;
      args.recorder.transforms.push(connection.id);
      args.recorder.scopedTransforms.push(`${scope.key}:${connection.id}`);
      return args.transform === undefined
        ? _relationsFor(connection)
        : args.transform(transformArgs);
    },
    incremental:
      args.isIncremental === false
        ? undefined
        : {
            getConnectionTimestamp: (connection) => {
              return connection.modifiedAt;
            },
          },
  };
}

/**
 * One checkpoint store per listings store, so two runs over the same
 * listings, as a resume is, also share their checkpoints.
 */
const CHECKPOINTS_BY_LISTINGS = new WeakMap<
  ListingsStore,
  InMemoryCheckpointStore
>();

function _checkpointsFor(listings: ListingsStore): InMemoryCheckpointStore {
  const existing = CHECKPOINTS_BY_LISTINGS.get(listings);
  if (existing !== undefined) {
    return existing;
  }
  const created = createInMemoryCheckpointStore();
  CHECKPOINTS_BY_LISTINGS.set(listings, created);
  return created;
}

function _stores(
  listings: ListingsStore = createInMemoryListingsStore(),
  checkpoints: CheckpointStore = _checkpointsFor(listings),
): EtlStores {
  return { listings, objects: undefined, checkpoints };
}

function _checkpoint(driveKey: string, minute: number): StoredCheckpoint {
  return {
    pipelineName: PIPELINE_NAME,
    driveKey,
    scopeKey: "all",
    highWaterMark: _at(minute),
    pipelineRunId: "earlier-run",
  };
}

function _checkpointValues(
  checkpoints: InMemoryCheckpointStore,
): Array<[string, Date]> {
  return checkpoints.getCheckpoints().map((checkpoint) => {
    return [checkpoint.driveKey, checkpoint.highWaterMark];
  });
}

function _datasetIds(listings: InMemoryListingsStore): string[] {
  const ids = listings.getRows().map((row) => {
    return row.external_dataset_id;
  });
  return [...new Set(ids)].sort();
}

function _upsertedRowCount(listings: InMemoryListingsStore): number {
  return listings.getUpsertBatches().reduce((sum, batch) => {
    return sum + batch.length;
  }, 0);
}

function _run(config: FakeConfig, options: EtlRunOptions = { mode: "full" }) {
  return createEtlEngine(config).run(options);
}

async function _runFailure(
  config: FakeConfig,
  options: EtlRunOptions = { mode: "full" },
): Promise<EtlRunFailedError> {
  const caught = await _run(config, options).then(
    () => {
      return undefined;
    },
    (error: unknown) => {
      return error;
    },
  );
  if (!(caught instanceof EtlRunFailedError)) {
    throw new Error("Expected the run to reject with EtlRunFailedError.");
  }
  return caught;
}

function _statusesOf(
  report: EtlRunReport,
): Array<[string, string, string | undefined]> {
  return report.crawls.map((crawl) => {
    return [crawl.driveKey, crawl.status, crawl.error];
  });
}

function _crawlsOf(report: EtlRunReport): Array<[string, string, string]> {
  return report.crawls.map((crawl) => {
    return [crawl.driveKey, crawl.scopeKey, crawl.status];
  });
}

/** A clock whose monotonic time moves 1 ms each time it is read. */
function _tickingClock(): EtlClock {
  let elapsedMs = 0;
  return {
    now: () => {
      return new Date(Date.UTC(2026, 9, 22) + elapsedMs);
    },
    monotonicMs: () => {
      elapsedMs += 1;
      return elapsedMs;
    },
  };
}

describe("createEtlEngine", () => {
  describe("windows", () => {
    it("starts each drive of an incremental run at its own checkpoint", async () => {
      const recorder = _recorder();
      const checkpoints = createInMemoryCheckpointStore({
        checkpoints: [_checkpoint("a", 10), _checkpoint("b", 20)],
      });

      await _run(
        _config({
          drives: [_drive("a", [[]]), _drive("b", [[]])],
          recorder,
          stores: _stores(createInMemoryListingsStore(), checkpoints),
        }),
        { mode: "incremental" },
      );

      expect([
        recorder.windows.get("a")?.since,
        recorder.windows.get("b")?.since,
      ]).toEqual([_at(10), _at(20)]);
    });

    it("starts an incremental drive with no checkpoint at no lower bound", async () => {
      const recorder = _recorder();

      await _run(
        _config({ drives: [_drive("a", [[]])], recorder, stores: _stores() }),
        {
          mode: "incremental",
        },
      );

      expect(recorder.windows.get("a")?.since).toBeUndefined();
    });

    it("ignores the checkpoint in a full run", async () => {
      const recorder = _recorder();
      const checkpoints = createInMemoryCheckpointStore({
        checkpoints: [_checkpoint("a", 10)],
      });

      await _run(
        _config({
          drives: [_drive("a", [[]])],
          recorder,
          stores: _stores(createInMemoryListingsStore(), checkpoints),
        }),
      );

      expect(recorder.windows.get("a")?.since).toBeUndefined();
    });

    it("lets an explicit since win over the checkpoint", async () => {
      const recorder = _recorder();
      const checkpoints = createInMemoryCheckpointStore({
        checkpoints: [_checkpoint("a", 30)],
      });

      await _run(
        _config({
          drives: [_drive("a", [[]])],
          recorder,
          stores: _stores(createInMemoryListingsStore(), checkpoints),
        }),
        { mode: "incremental", since: _at(5) },
      );

      expect(recorder.windows.get("a")?.since).toEqual(_at(5));
    });

    it("uses an explicit since as a full run's lower bound", async () => {
      const recorder = _recorder();

      await _run(
        _config({ drives: [_drive("a", [[]])], recorder, stores: _stores() }),
        {
          mode: "full",
          since: _at(5),
        },
      );

      expect(recorder.windows.get("a")?.since).toEqual(_at(5));
    });

    it("passes until to extract and does not write a connection at exactly until", async () => {
      const recorder = _recorder();
      const listings = createInMemoryListingsStore();

      await _run(
        _config({
          drives: [_drive("a", [[_connection("c1", 1), _connection("c2", 5)]])],
          recorder,
          stores: _stores(listings),
        }),
        { mode: "full", until: _at(5) },
      );

      expect([recorder.windows.get("a"), _datasetIds(listings)]).toEqual([
        { since: undefined, until: _at(5) },
        ["c1"],
      ]);
    });

    it("fetches the connection at the checkpoint again without rewriting it", async () => {
      const listings = createInMemoryListingsStore();
      const drives = [
        _drive("a", [[_connection("c1", 1), _connection("c2", 5)]]),
      ];
      await _run(
        _config({ drives, recorder: _recorder(), stores: _stores(listings) }),
      );

      const report = await _run(
        _config({ drives, recorder: _recorder(), stores: _stores(listings) }),
        { mode: "incremental" },
      );

      expect([
        report.crawls[0]?.relationsWritten,
        report.crawls[0]?.relationsUnchanged,
      ]).toEqual([0, 1]);
    });
  });

  describe("ordering and limits", () => {
    it("fails a drive whose source returns a connection out of order", async () => {
      const error = await _run(
        _config({
          drives: [_drive("a", [[_connection("c1", 5), _connection("c2", 1)]])],
          recorder: _recorder(),
          stores: _stores(),
        }),
      ).catch((caught: unknown) => {
        return caught;
      });

      expect(error).toBeInstanceOf(EtlRunFailedError);
      expect((error as EtlRunFailedError).report.crawls[0]?.error).toContain(
        "Drive a returned c2",
      );
      expect((error as EtlRunFailedError).errors[0]).toBeInstanceOf(
        OutOfOrderConnectionError,
      );
    });

    it("writes nothing from the out-of-order page and keeps earlier pages", async () => {
      const listings = createInMemoryListingsStore();

      await _run(
        _config({
          drives: [
            _drive("a", [
              [_connection("c1", 1)],
              [_connection("c2", 5), _connection("c3", 2)],
            ]),
          ],
          recorder: _recorder(),
          stores: _stores(listings),
        }),
      ).catch(() => {
        return undefined;
      });

      expect(_datasetIds(listings)).toEqual(["c1"]);
    });

    it("transforms a connection repeated across overlapping pages once", async () => {
      const recorder = _recorder();

      // Undropped, the second page's c2 would follow c3 and fail the order
      // check.
      await _run(
        _config({
          drives: [
            _drive("a", [
              [
                _connection("c1", 1),
                _connection("c2", 2),
                _connection("c3", 3),
              ],
              [
                _connection("c2", 2),
                _connection("c3", 3),
                _connection("c4", 4),
              ],
            ]),
          ],
          recorder,
          stores: _stores(),
        }),
      );

      expect(recorder.transforms).toEqual(["c1", "c2", "c3", "c4"]);
    });

    it("writes a connection again when it reappears with a newer timestamp", async () => {
      const recorder = _recorder();
      const listings = createInMemoryListingsStore();

      await _run(
        _config({
          drives: [
            _drive("a", [
              [_connection("c1", 1), _connection("c2", 2)],
              [_connection("c3", 3), _connection("c2", 4)],
            ]),
          ],
          recorder,
          stores: _stores(listings),
        }),
      );

      const storedC2 = listings.getRows().find((row) => {
        return row.external_dataset_id === "c2";
      });
      expect([recorder.transforms, storedC2?.date_of_last_update]).toEqual([
        ["c1", "c2", "c3", "c2"],
        _at(4).toISOString(),
      ]);
    });

    it("does not treat the same connection id in two drives as a repeat", async () => {
      const listings = createInMemoryListingsStore();

      await _run(
        _config({
          drives: [
            _drive("a", [[_connection("same", 1)]]),
            _drive("b", [[_connection("same", 1)]]),
          ],
          recorder: _recorder(),
          stores: _stores(listings),
        }),
      );

      expect(
        listings.getRows().map((row) => {
          return row.api_base_url;
        }),
      ).toEqual(["a", "b"]);
    });

    it("counts the limit across drives", async () => {
      const report = await _run(
        _config({
          drives: [
            _drive("a", [
              [
                _connection("a1", 1),
                _connection("a2", 2),
                _connection("a3", 3),
              ],
            ]),
            _drive("b", [
              [_connection("b1", 1), _connection("b2", 2)],
              [_connection("b3", 3), _connection("b4", 4)],
            ]),
          ],
          recorder: _recorder(),
          stores: _stores(),
        }),
        { mode: "full", limit: 5 },
      );

      expect(
        report.crawls.map((crawl) => {
          return crawl.connectionsFetched;
        }),
      ).toEqual([3, 2]);
    });

    it("stops fetching once the limit is reached and skips later drives", async () => {
      const recorder = _recorder();

      const report = await _run(
        _config({
          drives: [
            _drive("a", [
              [_connection("a1", 1), _connection("a2", 2)],
              [_connection("a3", 3)],
            ]),
            _drive("b", [[_connection("b1", 1)]]),
          ],
          recorder,
          stores: _stores(),
        }),
        { mode: "full", limit: 2 },
      );

      expect([recorder.events, report.crawls[1]?.status]).toEqual([
        ["listDrives", "a:page0", "a:closed"],
        "skipped",
      ]);
    });

    it("crawls drives one after another in listDrives order", async () => {
      const recorder = _recorder();

      await _run(
        _config({
          drives: [
            _drive("a", [[_connection("a1", 1)], [_connection("a2", 2)]]),
            _drive("b", [[_connection("b1", 1)]]),
          ],
          recorder,
          stores: _stores(),
        }),
      );

      expect(recorder.events).toEqual([
        "listDrives",
        "a:page0",
        "a:page1",
        "a:closed",
        "b:page0",
        "b:closed",
      ]);
    });

    it("does not check order for a pipeline without incremental config", async () => {
      const listings = createInMemoryListingsStore();

      await _run(
        _config({
          drives: [_drive("a", [[_connection("c1", 5), _connection("c2", 1)]])],
          recorder: _recorder(),
          stores: _stores(listings),
          isIncremental: false,
        }),
      );

      expect(_datasetIds(listings)).toEqual(["c1", "c2"]);
    });
  });

  describe("resuming", () => {
    it("writes every connection exactly once across a failed run and its resume", async () => {
      const listings = createInMemoryListingsStore();
      const pages: FakePage[] = [
        [_connection("c1", 1), _connection("c2", 2)],
        [_connection("c3", 3), _connection("c4", 4)],
        [_connection("c5", 5), _connection("c6", 6)],
        [_connection("c7", 7), _connection("c8", 8)],
      ];
      await _run(
        _config({
          drives: [_drive("a", pages, 2)],
          recorder: _recorder(),
          stores: _stores(listings),
        }),
      ).catch(() => {
        return undefined;
      });

      await _run(
        _config({
          drives: [_drive("a", pages)],
          recorder: _recorder(),
          stores: _stores(listings),
        }),
        { mode: "incremental" },
      );

      expect([_datasetIds(listings), _upsertedRowCount(listings)]).toEqual([
        ["c1", "c2", "c3", "c4", "c5", "c6", "c7", "c8"],
        8,
      ]);
    });

    it("continues after a limited run at the next connection", async () => {
      const listings = createInMemoryListingsStore();
      const drives = [
        _drive("a", [
          [_connection("c1", 1), _connection("c2", 2)],
          [_connection("c3", 3), _connection("c4", 4)],
        ]),
      ];
      await _run(
        _config({ drives, recorder: _recorder(), stores: _stores(listings) }),
        {
          mode: "full",
          limit: 3,
        },
      );

      const report = await _run(
        _config({ drives, recorder: _recorder(), stores: _stores(listings) }),
        { mode: "incremental" },
      );

      expect([
        report.crawls[0]?.relationsWritten,
        _datasetIds(listings).length,
      ]).toEqual([1, 4]);
    });

    it("advances the checkpoint past a connection with no relations", async () => {
      const listings = createInMemoryListingsStore();

      await _run(
        _config({
          drives: [
            _drive("a", [[_connection("c1", 1), _connection("c2", 2, 0)]]),
          ],
          recorder: _recorder(),
          stores: _stores(listings),
        }),
      );

      expect([
        _datasetIds(listings),
        _checkpointValues(_checkpointsFor(listings)),
      ]).toEqual([["c1"], [["a", _at(2)]]]);
    });

    it("writes a connection that shares the checkpoint's timestamp on resume", async () => {
      const listings = createInMemoryListingsStore();
      const drives = [
        _drive("a", [
          [_connection("c1", 1), _connection("c2", 5), _connection("c3", 5)],
        ]),
      ];
      await _run(
        _config({ drives, recorder: _recorder(), stores: _stores(listings) }),
        {
          mode: "full",
          limit: 2,
        },
      );

      const report = await _run(
        _config({ drives, recorder: _recorder(), stores: _stores(listings) }),
        { mode: "incremental" },
      );

      expect([
        report.crawls[0]?.relationsWritten,
        _datasetIds(listings),
      ]).toEqual([1, ["c1", "c2", "c3"]]);
    });
  });

  describe("checkpoints", () => {
    it("advances the checkpoint after each loaded page", async () => {
      const listings = createInMemoryListingsStore();
      const checkpoints = _checkpointsFor(listings);

      await _run(
        _config({
          drives: [
            _drive("a", [
              [_connection("c1", 1), _connection("c2", 2)],
              [_connection("c3", 3)],
            ]),
          ],
          recorder: _recorder(),
          stores: _stores(listings),
        }),
      );

      expect([
        _checkpointValues(checkpoints),
        checkpoints.getWriteCount(),
      ]).toEqual([[["a", _at(3)]], 2]);
    });

    it("resumes a failed crawl from its last loaded page", async () => {
      const listings = createInMemoryListingsStore();
      const pages: FakePage[] = [
        [_connection("c1", 1), _connection("c2", 2)],
        [_connection("c3", 3)],
      ];
      await _run(
        _config({
          drives: [_drive("a", pages, 1)],
          recorder: _recorder(),
          stores: _stores(listings),
        }),
      ).catch(() => {
        return undefined;
      });
      const recorder = _recorder();

      await _run(
        _config({
          drives: [_drive("a", pages)],
          recorder,
          stores: _stores(listings),
        }),
        { mode: "incremental" },
      );

      expect(recorder.windows.get("a")?.since).toEqual(_at(2));
    });

    it("keeps a future-dated connection from moving the checkpoint", async () => {
      const listings = createInMemoryListingsStore();
      const futureConnection: FakeConnection = {
        id: "future",
        modifiedAt: new Date("2099-01-01T00:00:00.000Z"),
        relationCount: 1,
      };

      await _run(
        _config({
          drives: [_drive("a", [[_connection("c1", 1), futureConnection]])],
          recorder: _recorder(),
          stores: _stores(listings),
        }),
      );

      expect(_checkpointValues(_checkpointsFor(listings))).toEqual([
        ["a", _at(1)],
      ]);
    });

    it("does not advance the checkpoint from a since later than it", async () => {
      const checkpoints = createInMemoryCheckpointStore({
        checkpoints: [_checkpoint("a", 5)],
      });

      await _run(
        _config({
          drives: [_drive("a", [[_connection("c1", 11)]])],
          recorder: _recorder(),
          stores: _stores(createInMemoryListingsStore(), checkpoints),
        }),
        { mode: "full", since: _at(10) },
      );

      expect(_checkpointValues(checkpoints)).toEqual([["a", _at(5)]]);
    });

    it("does not create a checkpoint from an explicit since", async () => {
      const checkpoints = createInMemoryCheckpointStore();

      await _run(
        _config({
          drives: [_drive("a", [[_connection("c1", 11)]])],
          recorder: _recorder(),
          stores: _stores(createInMemoryListingsStore(), checkpoints),
        }),
        { mode: "full", since: _at(10) },
      );

      expect(checkpoints.getCheckpoints()).toEqual([]);
    });

    it("advances the checkpoint from a since at or before it", async () => {
      const checkpoints = createInMemoryCheckpointStore({
        checkpoints: [_checkpoint("a", 5)],
      });

      await _run(
        _config({
          drives: [_drive("a", [[_connection("c1", 6)]])],
          recorder: _recorder(),
          stores: _stores(createInMemoryListingsStore(), checkpoints),
        }),
        { mode: "full", since: _at(5) },
      );

      expect(_checkpointValues(checkpoints)).toEqual([["a", _at(6)]]);
    });

    it("never moves the checkpoint backward", async () => {
      const checkpoints = createInMemoryCheckpointStore({
        checkpoints: [_checkpoint("a", 10)],
      });

      await _run(
        _config({
          drives: [_drive("a", [[_connection("c1", 2), _connection("c2", 3)]])],
          recorder: _recorder(),
          stores: _stores(createInMemoryListingsStore(), checkpoints),
        }),
        { mode: "full", since: _at(1) },
      );

      expect([
        _checkpointValues(checkpoints),
        checkpoints.getWriteCount(),
      ]).toEqual([[["a", _at(10)]], 0]);
    });

    it("advances the checkpoint in a full run from the start", async () => {
      const checkpoints = createInMemoryCheckpointStore();

      await _run(
        _config({
          drives: [_drive("a", [[_connection("c1", 1)]])],
          recorder: _recorder(),
          stores: _stores(createInMemoryListingsStore(), checkpoints),
        }),
      );

      expect(_checkpointValues(checkpoints)).toEqual([["a", _at(1)]]);
    });

    it("writes no checkpoint for a pipeline without incremental config", async () => {
      const checkpoints = createInMemoryCheckpointStore();

      await _run(
        _config({
          drives: [_drive("a", [[_connection("c1", 1)]])],
          recorder: _recorder(),
          stores: _stores(createInMemoryListingsStore(), checkpoints),
          isIncremental: false,
        }),
      );

      expect(checkpoints.getWriteCount()).toBe(0);
    });

    it("fails a drive whose checkpoint cannot be written and keeps its rows", async () => {
      const listings = createInMemoryListingsStore();
      const failingCheckpoints: CheckpointStore = {
        read: async () => {
          return undefined;
        },
        write: async () => {
          throw new Error("checkpoint write failed");
        },
      };

      const error = await _runFailure(
        _config({
          drives: [_drive("a", [[_connection("c1", 1)]])],
          recorder: _recorder(),
          stores: _stores(listings, failingCheckpoints),
        }),
      );

      expect([
        error.report.crawls[0]?.error,
        error.report.crawls[0]?.connectionsFetched,
        error.report.crawls[0]?.relationsWritten,
        _datasetIds(listings),
      ]).toEqual(["checkpoint write failed", 1, 1, ["c1"]]);
    });

    it("leaves the checkpoint at the last loaded page when a later page fails to load", async () => {
      const listings = createInMemoryListingsStore();
      const checkpoints = createInMemoryCheckpointStore();
      let upsertCalls = 0;
      const failingListings: ListingsStore = {
        ...listings,
        upsertListingsWithColumns: async (entries) => {
          upsertCalls += 1;
          if (upsertCalls === 2) {
            throw new Error("upsert failed");
          }
          return listings.upsertListingsWithColumns(entries);
        },
      };

      await _runFailure(
        _config({
          drives: [
            _drive("a", [[_connection("c1", 1)], [_connection("c2", 2)]]),
          ],
          recorder: _recorder(),
          stores: _stores(failingListings, checkpoints),
        }),
      );

      expect(_checkpointValues(checkpoints)).toEqual([["a", _at(1)]]);
    });
  });

  describe("scopes", () => {
    const INVALID_SCOPE_LISTS: ReadonlyArray<
      [string, () => readonly EtlScope[], string]
    > = [
      [
        "an invalid key",
        () => {
          return [{ key: "Not Valid" }];
        },
        "is not valid",
      ],
      [
        "a repeated key",
        () => {
          return [{ key: "x" }, { key: "x" }];
        },
        "more than once",
      ],
      [
        "no scopes",
        () => {
          return [];
        },
        "declares no scopes",
      ],
      [
        "a throwing listScopes",
        () => {
          throw new Error("no scopes for a");
        },
        "no scopes for a",
      ],
    ];

    function _twoScopes(): readonly EtlScope[] {
      return [{ key: "x" }, { key: "y" }];
    }

    it("crawls a drive with no listScopes once, as scope all, and keys its rows all", async () => {
      const listings = createInMemoryListingsStore();

      const report = await _run(
        _config({
          drives: [_drive("a", [[_connection("c1", 1)]])],
          recorder: _recorder(),
          stores: _stores(listings),
        }),
      );

      expect([
        _crawlsOf(report),
        listings.getRows().map((row) => {
          return row.pipeline_scope_keys;
        }),
      ]).toEqual([[["a", "all", "ok"]], [["all"]]]);
    });

    it("crawls each scope of a drive in order, passing the scope to extract and transform", async () => {
      const recorder = _recorder();

      const report = await _run(
        _config({
          drives: [_drive("a", [[_connection("c1", 1)]])],
          recorder,
          stores: _stores(),
          listScopes: _twoScopes,
        }),
      );

      expect([
        recorder.events,
        recorder.scopedTransforms,
        _crawlsOf(report),
      ]).toEqual([
        ["listDrives", "a/x:page0", "a/x:closed", "a/y:page0", "a/y:closed"],
        ["x:c1", "y:c1"],
        [
          ["a", "x", "ok"],
          ["a", "y", "ok"],
        ],
      ]);
    });

    it("starts each scope of an incremental run at its own checkpoint", async () => {
      const recorder = _recorder();
      const checkpoints = createInMemoryCheckpointStore({
        checkpoints: [{ ..._checkpoint("a", 10), scopeKey: "x" }],
      });

      await _run(
        _config({
          drives: [_drive("a", [[]])],
          recorder,
          stores: _stores(createInMemoryListingsStore(), checkpoints),
          listScopes: _twoScopes,
        }),
        { mode: "incremental" },
      );

      expect([
        recorder.scopeWindows.get("a/x")?.since,
        recorder.scopeWindows.get("a/y")?.since,
      ]).toEqual([_at(10), undefined]);
    });

    it("keeps one checkpoint per scope", async () => {
      const checkpoints = createInMemoryCheckpointStore();

      await _run(
        _config({
          drives: [
            {
              key: "a",
              pages: [],
              pagesByScope: {
                x: [[_connection("c1", 1)]],
                y: [[_connection("c1", 1), _connection("c2", 2)]],
              },
            },
          ],
          recorder: _recorder(),
          stores: _stores(createInMemoryListingsStore(), checkpoints),
          listScopes: _twoScopes,
        }),
      );

      expect(
        checkpoints.getCheckpoints().map((checkpoint) => {
          return [checkpoint.scopeKey, checkpoint.highWaterMark];
        }),
      ).toEqual([
        ["x", _at(1)],
        ["y", _at(2)],
      ]);
    });

    it("records both scopes on a relation two scopes produce, and leaves it unchanged on a rerun", async () => {
      const listings = createInMemoryListingsStore();
      const config = _config({
        drives: [_drive("a", [[_connection("c1", 1)]])],
        recorder: _recorder(),
        stores: _stores(listings),
        listScopes: _twoScopes,
      });

      const first = await _run(config);
      const second = await _run(config);

      const written = (report: EtlRunReport) => {
        return report.crawls.map((crawl) => {
          return crawl.relationsWritten;
        });
      };
      expect([
        written(first),
        written(second),
        listings.getRows().map((row) => {
          return row.pipeline_scope_keys;
        }),
      ]).toEqual([[1, 1], [0, 0], [["x", "y"]]]);
    });

    it.each(INVALID_SCOPE_LISTS)(
      "fails a drive with %s under scope listScopes and still crawls the next",
      async (_name, scopesForA, message) => {
        const report = await _run(
          _config({
            drives: [
              _drive("a", [[_connection("a1", 1)]]),
              _drive("b", [[_connection("b1", 1)]]),
            ],
            recorder: _recorder(),
            stores: _stores(),
            listScopes: (drive) => {
              return drive.key === "a" ? scopesForA() : [{ key: "all" }];
            },
          }),
        );

        expect([_crawlsOf(report), report.crawls[0]?.error]).toEqual([
          [
            ["a", "listScopes", "failed"],
            ["b", "all", "ok"],
          ],
          expect.stringContaining(message),
        ]);
      },
    );

    it("reports a drive whose key cannot be read under scope listScopes", async () => {
      const report = await _run(
        _config({
          drives: [_drive("a", [[]]), _drive("b", [[]])],
          recorder: _recorder(),
          stores: _stores(),
          getDriveKey: (drive) => {
            if (drive.key === "a") {
              throw new Error("no key for a");
            }
            return drive.key;
          },
        }),
      );

      expect(_crawlsOf(report)[0]).toEqual([
        "listDrives[0]",
        "listScopes",
        "failed",
      ]);
    });

    it("crawls only the scopes a run names", async () => {
      const report = await _run(
        _config({
          drives: [_drive("a", [[]]), _drive("b", [[]])],
          recorder: _recorder(),
          stores: _stores(),
          listScopes: (drive) => {
            return drive.key === "a" ? _twoScopes() : [{ key: "z" }];
          },
        }),
        { mode: "full", scopes: ["y"] },
      );

      expect(_crawlsOf(report)).toEqual([["a", "y", "ok"]]);
    });

    it("rejects a scope no drive declares before any extract", async () => {
      const recorder = _recorder();

      const run = _run(
        _config({
          drives: [_drive("a", [[]])],
          recorder,
          stores: _stores(),
          listScopes: _twoScopes,
        }),
        { mode: "full", scopes: ["nope"] },
      );

      await expect(run).rejects.toThrow(EtlRunOptionsError);
      await expect(run).rejects.toThrow("has no scope nope");
      expect(recorder.events).toEqual(["listDrives"]);
    });

    it.each([[[] as string[]], [["Not Valid"]]])(
      "rejects the scopes %j before listing drives",
      async (scopes) => {
        const recorder = _recorder();

        const run = _run(
          _config({ drives: [_drive("a", [[]])], recorder, stores: _stores() }),
          { mode: "full", scopes },
        );

        await expect(run).rejects.toThrow(EtlRunOptionsError);
        expect(recorder.events).toEqual([]);
      },
    );

    it("counts the limit across scopes", async () => {
      const report = await _run(
        _config({
          drives: [
            _drive("a", [
              [
                _connection("c1", 1),
                _connection("c2", 2),
                _connection("c3", 3),
              ],
            ]),
          ],
          recorder: _recorder(),
          stores: _stores(),
          listScopes: _twoScopes,
        }),
        { mode: "full", limit: 4 },
      );

      expect(
        report.crawls.map((crawl) => {
          return crawl.connectionsFetched;
        }),
      ).toEqual([3, 1]);
    });

    it("lists each drive's live scopes without crawling", async () => {
      const recorder = _recorder();

      const scopes = await createEtlEngine(
        _config({
          drives: [_drive("a", [[]]), _drive("b", [[]])],
          recorder,
          stores: _stores(),
          listScopes: (drive) => {
            return drive.key === "a" ? _twoScopes() : [{ key: "all" }];
          },
        }),
      ).listScopes();

      expect([scopes, recorder.events]).toEqual([
        [
          { driveKey: "a", scopeKeys: ["x", "y"] },
          { driveKey: "b", scopeKeys: ["all"] },
        ],
        ["listDrives"],
      ]);
    });

    it("refuses to list scopes when a drive's scopes are invalid", async () => {
      await expect(
        createEtlEngine(
          _config({
            drives: [_drive("a", [[]])],
            recorder: _recorder(),
            stores: _stores(),
            listScopes: () => {
              return [];
            },
          }),
        ).listScopes(),
      ).rejects.toThrow("could not list the scopes of drive a");
    });

    it("lists the default scope without Supabase credentials", async () => {
      const scopes = await createEtlEngine(
        _config({
          drives: [_drive("a", [[]])],
          recorder: _recorder(),
          supabase: { url: undefined, serviceRoleKey: undefined },
        }),
      ).listScopes();

      expect(scopes).toEqual([{ driveKey: "a", scopeKeys: ["all"] }]);
    });

    it("rejects with every crawl's report when every crawl fails", async () => {
      const error = await _runFailure(
        _config({
          drives: [_drive("a", [[]], 0)],
          recorder: _recorder(),
          stores: _stores(),
          listScopes: _twoScopes,
        }),
      );

      expect([_crawlsOf(error.report), error.message]).toEqual([
        [
          ["a", "x", "failed"],
          ["a", "y", "failed"],
        ],
        "Every crawl failed. a [x]: a/x failed; a [y]: a/y failed",
      ]);
    });
  });

  describe("failures and the report", () => {
    it("reports a failed drive and still crawls the next one", async () => {
      const report = await _run(
        _config({
          drives: [
            _drive("a", [[_connection("a1", 1)]], 0),
            _drive("b", [[_connection("b1", 1)]]),
          ],
          recorder: _recorder(),
          stores: _stores(),
        }),
      );

      expect(
        report.crawls.map((crawl) => {
          return [crawl.driveKey, crawl.status, crawl.error];
        }),
      ).toEqual([
        ["a", "failed", "a failed"],
        ["b", "ok", undefined],
      ]);
    });

    it("rejects naming every drive's error when every drive fails", async () => {
      const run = _run(
        _config({
          drives: [_drive("a", [[]], 0), _drive("b", [[]], 0)],
          recorder: _recorder(),
          stores: _stores(),
        }),
      );

      await expect(run).rejects.toThrow(EtlRunFailedError);
      await expect(run).rejects.toThrow("a [all]: a failed; b [all]: b failed");
    });

    it("keeps every failed drive's error, in drive order, on the rejection", async () => {
      const error = await _runFailure(
        _config({
          drives: [_drive("a", [[]], 0), _drive("b", [[]], 0)],
          recorder: _recorder(),
          stores: _stores(),
        }),
      );

      const messages = error.errors.map((driveError) => {
        return driveError instanceof Error ? driveError.message : driveError;
      });
      expect([
        messages,
        error.cause instanceof AggregateError,
        (error.cause as AggregateError).errors,
      ]).toEqual([["a failed", "b failed"], true, error.errors]);
    });

    it("reports a drive that throws undefined as failed", async () => {
      const report = await _run(
        _config({
          drives: [
            _drive("a", [[_connection("a1", 1)]]),
            _drive("b", [[_connection("b1", 1)]]),
          ],
          recorder: _recorder(),
          stores: _stores(),
          transform: ({ drive, connection }) => {
            if (drive.key === "a") {
              throw undefined;
            }
            return _relationsFor(connection);
          },
        }),
      );

      expect(_statusesOf(report)).toEqual([
        ["a", "failed", "undefined"],
        ["b", "ok", undefined],
      ]);
    });

    it("reports a drive whose key cannot be read as failed under its listDrives position", async () => {
      const report = await _run(
        _config({
          drives: [
            _drive("a", [[_connection("a1", 1)]]),
            _drive("b", [[_connection("b1", 1)]]),
          ],
          recorder: _recorder(),
          stores: _stores(),
          getDriveKey: (drive) => {
            if (drive.key === "a") {
              throw new Error("no key for a");
            }
            return drive.key;
          },
        }),
      );

      expect(_statusesOf(report)).toEqual([
        ["listDrives[0]", "failed", "no key for a"],
        ["b", "ok", undefined],
      ]);
    });

    it("reports a drive whose checkpoint cannot be read as failed and still crawls the next one", async () => {
      const checkpoints: CheckpointStore = {
        read: async ({ driveKey }) => {
          if (driveKey === "a") {
            throw new Error("checkpoint unavailable");
          }
          return undefined;
        },
        write: async () => {
          return undefined;
        },
      };

      const report = await _run(
        _config({
          drives: [
            _drive("a", [[_connection("a1", 1)]]),
            _drive("b", [[_connection("b1", 1)]]),
          ],
          recorder: _recorder(),
          stores: _stores(createInMemoryListingsStore(), checkpoints),
        }),
        { mode: "incremental" },
      );

      expect(_statusesOf(report)).toEqual([
        ["a", "failed", "checkpoint unavailable"],
        ["b", "ok", undefined],
      ]);
    });

    it("fails a drive at a failed upsert and keeps its earlier pages", async () => {
      const listings = createInMemoryListingsStore();
      let upsertCalls = 0;
      const failingListings: ListingsStore = {
        ...listings,
        upsertListingsWithColumns: async (entries) => {
          upsertCalls += 1;
          if (upsertCalls === 2) {
            throw new Error("upsert failed");
          }
          return listings.upsertListingsWithColumns(entries);
        },
      };

      const report = await _run(
        _config({
          drives: [
            _drive("a", [[_connection("a1", 1)], [_connection("a2", 2)]]),
            _drive("b", [[_connection("b1", 1)]]),
          ],
          recorder: _recorder(),
          stores: _stores(failingListings),
        }),
      );

      expect([
        report.crawls[0]?.status,
        report.crawls[0]?.relationsWritten,
        _datasetIds(listings),
      ]).toEqual(["failed", 1, ["a1", "b1"]]);
    });

    it("fails a drive at a relation updated later than its connection", async () => {
      const listings = createInMemoryListingsStore();

      const error = await _runFailure(
        _config({
          drives: [
            _drive("a", [[_connection("c1", 1)], [_connection("c2", 2)]]),
          ],
          recorder: _recorder(),
          stores: _stores(listings),
          transform: ({ connection }) => {
            return _relationsFor(connection).map((relation) => {
              return connection.id === "c2"
                ? { ...relation, sourceUpdatedAt: _at(9) }
                : relation;
            });
          },
        }),
      );

      expect([error.report.crawls[0]?.error, _datasetIds(listings)]).toEqual([
        expect.stringContaining(
          `Drive a returned c2 with a relation updated at ${_at(9).toISOString()}, later than the connection's timestamp ${_at(2).toISOString()}.`,
        ),
        ["c1"],
      ]);
    });

    it("reports each drive's window, counts, and newest timestamp", async () => {
      const report = await _run(
        _config({
          drives: [_drive("a", [[_connection("c1", 1), _connection("c2", 2)]])],
          recorder: _recorder(),
          stores: _stores(),
        }),
        { mode: "full", since: _at(0) },
      );

      expect(report).toEqual({
        pipelineRunId: expect.stringMatching(/^[0-9a-f-]{36}$/),
        mode: "full",
        crawls: [
          {
            driveKey: "a",
            scopeKey: "all",
            window: { since: _at(0), until: undefined },
            connectionsFetched: 2,
            relationsWritten: 2,
            relationsUnchanged: 0,
            newestTimestamp: _at(2),
            status: "ok",
            startedAt: expect.any(Date),
            finishedAt: expect.any(Date),
            checkpointBefore: undefined,
            checkpointAfter: undefined,
            metrics: expect.objectContaining({
              denominators: expect.objectContaining({ pageCount: 1 }),
            }),
          },
        ],
      });
    });
  });

  describe("metrics", () => {
    it("times each crawl's stages and dates it", async () => {
      const report = await _run(
        _config({
          drives: [
            _drive("a", [[_connection("c1", 1)], [_connection("c2", 2)]]),
          ],
          recorder: _recorder(),
          stores: _stores(),
          clock: _tickingClock(),
        }),
        { mode: "incremental" },
      );

      const [crawl] = report.crawls;
      const timings = crawl?.metrics.timings;
      expect([
        timings !== undefined && timings.setupMs > 0,
        timings !== undefined && timings.extractMs > 0,
        timings !== undefined && timings.transformMs > 0,
        timings !== undefined && timings.loadWriteMs > 0,
        timings !== undefined && timings.checkpointWriteMs > 0,
        crawl !== undefined &&
          crawl.finishedAt.getTime() > crawl.startedAt.getTime(),
      ]).toEqual([true, true, true, true, true, true]);
    });

    it("counts pages, datasets, and listings, and records the checkpoint before and after", async () => {
      const checkpoints = createInMemoryCheckpointStore({
        checkpoints: [_checkpoint("a", 0)],
      });
      const listings = createInMemoryListingsStore();
      const report = await _run(
        _config({
          drives: [
            _drive("a", [[_connection("c1", 1, 2)], [_connection("c2", 2)]]),
          ],
          recorder: _recorder(),
          stores: _stores(listings, checkpoints),
        }),
        { mode: "incremental" },
      );

      const [crawl] = report.crawls;
      expect([
        crawl?.metrics.denominators.pageCount,
        crawl?.metrics.denominators.datasetsFetched,
        crawl?.metrics.denominators.listingsConsidered,
        crawl?.metrics.denominators.listingsWritten,
        crawl?.checkpointBefore,
        crawl?.checkpointAfter,
      ]).toEqual([2, 2, 3, 3, _at(0), _at(2)]);
    });

    it("collects the pipeline's own metrics from transform", async () => {
      const report = await _run(
        _config({
          drives: [_drive("a", [[_connection("c1", 1), _connection("c2", 2)]])],
          recorder: _recorder(),
          stores: _stores(),
          transform: ({ connection, metrics }) => {
            metrics.increment("fake.transforms");
            return _relationsFor(connection);
          },
        }),
      );

      expect(report.crawls[0]?.metrics.pipelineMetrics).toEqual({
        "fake.transforms": 2,
      });
    });

    it("reports zero metrics for a crawl skipped by the limit", async () => {
      const report = await _run(
        _config({
          drives: [
            _drive("a", [[_connection("a1", 1)]]),
            _drive("b", [[_connection("b1", 1)]]),
          ],
          recorder: _recorder(),
          stores: _stores(),
        }),
        { mode: "full", limit: 1 },
      );

      expect(report.crawls[1]).toMatchObject({
        status: "skipped",
        metrics: NO_CRAWL_METRICS,
      });
    });
  });

  describe("configuration", () => {
    it("rejects an incremental run without incremental config before listing drives", async () => {
      const recorder = _recorder();

      const run = _run(
        _config({
          drives: [_drive("a", [[]])],
          recorder,
          stores: _stores(),
          isIncremental: false,
        }),
        { mode: "incremental" },
      );

      await expect(run).rejects.toThrow(EtlRunOptionsError);
      await expect(run).rejects.toThrow("does not support incremental runs");
      expect(recorder.events).toEqual([]);
    });

    it.each([
      ["since", { since: new Date("2026-10-01T00:00:00Z") }],
      ["until", { until: new Date("2026-10-15T00:00:00Z") }],
    ])(
      "rejects a %s window without incremental config before listing drives",
      async (_name, window) => {
        const recorder = _recorder();

        const run = _run(
          _config({
            drives: [_drive("a", [[]])],
            recorder,
            stores: _stores(),
            isIncremental: false,
          }),
          { mode: "full", ...window },
        );

        await expect(run).rejects.toThrow(EtlRunOptionsError);
        await expect(run).rejects.toThrow(
          "does not support --since or --until",
        );
        expect(recorder.events).toEqual([]);
      },
    );

    it("rejects missing Supabase credentials before listing drives", async () => {
      const recorder = _recorder();

      await expect(
        _run(
          _config({
            drives: [_drive("a", [[]])],
            recorder,
            supabase: { url: undefined, serviceRoleKey: "service-role-key" },
          }),
        ),
      ).rejects.toThrow("supabase.url");
      expect(recorder.events).toEqual([]);
    });

    it("rejects an incremental pipeline with no checkpoint store before listing drives", async () => {
      const recorder = _recorder();

      const run = _run(
        _config({
          drives: [_drive("a", [[]])],
          recorder,
          stores: {
            listings: createInMemoryListingsStore(),
            objects: undefined,
          },
        }),
      );

      await expect(run).rejects.toThrow(
        "needs somewhere to keep its checkpoints",
      );
      expect(recorder.events).toEqual([]);
    });

    it.each([Number.NaN, 1.5, -1])(
      "rejects a limit of %s before listing drives",
      async (limit) => {
        const recorder = _recorder();

        const run = _run(
          _config({
            drives: [_drive("a", [[]])],
            recorder,
            stores: _stores(),
          }),
          { mode: "full", limit },
        );

        await expect(run).rejects.toThrow(EtlRunOptionsError);
        await expect(run).rejects.toThrow(
          "limit must be an integer of 0 or more",
        );
        expect(recorder.events).toEqual([]);
      },
    );

    it("skips every drive with a limit of 0", async () => {
      const recorder = _recorder();

      const report = await _run(
        _config({ drives: [_drive("a", [[]])], recorder, stores: _stores() }),
        { mode: "full", limit: 0 },
      );

      expect([recorder.events, _statusesOf(report)]).toEqual([
        ["listDrives"],
        [["a", "skipped", undefined]],
      ]);
    });
  });
});
