import { createEtlEngine } from "@etl/EtlEngine/createEtlEngine/createEtlEngine";
import { EtlRunFailedError } from "@etl/EtlEngine/EtlRunFailedError";
import { EtlRunOptionsError } from "@etl/EtlEngine/EtlRunOptionsError";
import { OutOfOrderConnectionError } from "@etl/EtlEngine/OutOfOrderConnectionError";
import { createInMemoryListingsStore } from "@etl/stores/InMemoryListingsStore/createInMemoryListingsStore";
import { describe, expect, it, vi } from "vitest";
import type {
  ApiResourceRelation,
  EtlEngineConfig,
  EtlIncrementalConfig,
  EtlRunOptions,
  EtlRunReport,
  EtlRunWindow,
  EtlStores,
} from "@etl/EtlEngine/EtlEngine.types";
import type {
  ListingsStore,
  StoredListingRow,
} from "@etl/stores/EtlStores.types";
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
}>;
type Recorder = {
  events: string[];
  windows: Map<string, EtlRunWindow>;
  /** The id of each connection passed to `transform`, in call order. */
  transforms: string[];
};
type FakeConfig = EtlEngineConfig<FakeDrive, FakeConnection>;

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
  return { events: [], windows: new Map(), transforms: [] };
}

async function* _yieldPages(
  drive: FakeDrive,
  recorder: Recorder,
): AsyncGenerator<FakePage> {
  try {
    // Sequential on purpose: the fake pages like a real source, one at a
    // time.
    for (const [index, page] of drive.pages.entries()) {
      if (drive.failAtPage === index) {
        throw new Error(`${drive.key} failed`);
      }
      recorder.events.push(`${drive.key}:page${index}`);
      yield page;
    }
  } finally {
    recorder.events.push(`${drive.key}:closed`);
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
    };
  });
}

function _config(args: {
  drives: readonly FakeDrive[];
  recorder: Recorder;
  stores?: EtlStores;
  isIncremental?: boolean;
  readHighWaterMark?: EtlIncrementalConfig<
    FakeDrive,
    FakeConnection
  >["readHighWaterMark"];
  supabase?: FakeConfig["supabase"];
  getDriveKey?: FakeConfig["getDriveKey"];
  transform?: FakeConfig["transform"];
}): FakeConfig {
  return {
    name: PIPELINE_NAME,
    service: "socrata",
    supabase: args.supabase,
    output: {
      listingsTable: "data_catalog_listings",
      relationColumnsTable: "data_catalog_listings__relation_columns",
    },
    stores: args.stores,
    listDrives: () => {
      args.recorder.events.push("listDrives");
      return args.drives;
    },
    getDriveKey:
      args.getDriveKey ??
      ((drive) => {
        return drive.key;
      }),
    extract: ({ drive, window }) => {
      args.recorder.windows.set(drive.key, window);
      return _yieldPages(drive, args.recorder);
    },
    getConnectionId: (connection) => {
      return connection.id;
    },
    transform: (transformArgs) => {
      args.recorder.transforms.push(transformArgs.connection.id);
      return args.transform === undefined
        ? _relationsFor(transformArgs.connection)
        : args.transform(transformArgs);
    },
    incremental:
      args.isIncremental === false
        ? undefined
        : {
            getConnectionTimestamp: (connection) => {
              return connection.modifiedAt;
            },
            readHighWaterMark: args.readHighWaterMark,
          },
  };
}

function _stores(
  listings: ListingsStore = createInMemoryListingsStore(),
): EtlStores {
  return { listings, objects: undefined };
}

function _storedRow(args: {
  id: string;
  driveKey: string;
  minute: number;
}): StoredListingRow {
  return {
    id: `listing-${args.id}`,
    access_kind: "api_resource",
    pipeline_name: PIPELINE_NAME,
    pipeline_run_id: "earlier-run",
    display_name: `Dataset ${args.id}`,
    external_organization_name: "Fake Org",
    external_dataset_id: args.id,
    date_of_last_update: _at(args.minute).toISOString(),
    date_of_last_sync: "2026-10-01T00:00:00.000Z",
    external_service_name: null,
    source_url: null,
    canonical_urls: null,
    license: null,
    update_frequency: null,
    description: null,
    notes: null,
    metadata: null,
    coverage_start_date: null,
    coverage_end_date: null,
    api_service: "socrata",
    api_base_url: args.driveKey,
    api_resource_id: `${args.id}-r0`,
    api_resource_format: "CSV",
    parquet_file_name: null,
  };
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
  return report.drives.map((drive) => {
    return [drive.driveKey, drive.status, drive.error];
  });
}

describe("createEtlEngine", () => {
  describe("windows", () => {
    it("starts each drive of an incremental run at its own high-water mark", async () => {
      const recorder = _recorder();
      const listings = createInMemoryListingsStore({
        rows: [
          _storedRow({ id: "a1", driveKey: "a", minute: 10 }),
          _storedRow({ id: "b1", driveKey: "b", minute: 20 }),
        ],
      });

      await _run(
        _config({
          drives: [_drive("a", [[]]), _drive("b", [[]])],
          recorder,
          stores: _stores(listings),
        }),
        { mode: "incremental" },
      );

      expect([
        recorder.windows.get("a")?.since,
        recorder.windows.get("b")?.since,
      ]).toEqual([_at(10), _at(20)]);
    });

    it("starts an incremental drive with no rows at no lower bound", async () => {
      const recorder = _recorder();

      await _run(
        _config({ drives: [_drive("a", [[]])], recorder, stores: _stores() }),
        {
          mode: "incremental",
        },
      );

      expect(recorder.windows.get("a")?.since).toBeUndefined();
    });

    it("ignores the high-water mark in a full run", async () => {
      const recorder = _recorder();
      const listings = createInMemoryListingsStore({
        rows: [_storedRow({ id: "a1", driveKey: "a", minute: 10 })],
      });

      await _run(
        _config({
          drives: [_drive("a", [[]])],
          recorder,
          stores: _stores(listings),
        }),
      );

      expect(recorder.windows.get("a")?.since).toBeUndefined();
    });

    it("lets an explicit since win without reading the high-water mark", async () => {
      const recorder = _recorder();
      const readHighWaterMark = vi.fn(async () => {
        return _at(30);
      });

      await _run(
        _config({
          drives: [_drive("a", [[]])],
          recorder,
          stores: _stores(),
          readHighWaterMark,
        }),
        { mode: "incremental", since: _at(5) },
      );

      expect([
        recorder.windows.get("a")?.since,
        readHighWaterMark.mock.calls.length,
      ]).toEqual([_at(5), 0]);
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

    it("fetches the connection at the high-water mark again without rewriting it", async () => {
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
        report.drives[0]?.relationsWritten,
        report.drives[0]?.relationsUnchanged,
      ]).toEqual([0, 1]);
    });

    it("passes the drive to a custom readHighWaterMark and uses its value", async () => {
      const recorder = _recorder();
      const readHighWaterMark = vi.fn(async () => {
        return _at(30);
      });

      await _run(
        _config({
          drives: [_drive("a", [[]])],
          recorder,
          stores: _stores(),
          readHighWaterMark,
        }),
        { mode: "incremental" },
      );

      expect(readHighWaterMark).toHaveBeenCalledWith(
        expect.objectContaining({
          driveKey: "a",
          drive: expect.objectContaining({ key: "a" }),
        }),
      );
      expect(recorder.windows.get("a")?.since).toEqual(_at(30));
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
      expect((error as EtlRunFailedError).report.drives[0]?.error).toContain(
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
        report.drives.map((drive) => {
          return drive.connectionsFetched;
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

      expect([recorder.events, report.drives[1]?.status]).toEqual([
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
        report.drives[0]?.relationsWritten,
        _datasetIds(listings).length,
      ]).toEqual([1, 4]);
    });

    it("does not move the high-water mark for a connection with no relations", async () => {
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

      expect(_datasetIds(listings)).toEqual(["c1"]);
      await expect(
        listings.readHighWaterMark({
          pipelineName: PIPELINE_NAME,
          apiBaseUrl: "a",
        }),
      ).resolves.toEqual(_at(1));
    });

    it("writes a connection that shares the high-water mark's timestamp on resume", async () => {
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
        report.drives[0]?.relationsWritten,
        _datasetIds(listings),
      ]).toEqual([1, ["c1", "c2", "c3"]]);
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
        report.drives.map((drive) => {
          return [drive.driveKey, drive.status, drive.error];
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
      await expect(run).rejects.toThrow("a: a failed; b: b failed");
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

    it("reports a drive whose high-water mark cannot be read as failed and still crawls the next one", async () => {
      const report = await _run(
        _config({
          drives: [
            _drive("a", [[_connection("a1", 1)]]),
            _drive("b", [[_connection("b1", 1)]]),
          ],
          recorder: _recorder(),
          stores: _stores(),
          readHighWaterMark: async ({ driveKey }) => {
            if (driveKey === "a") {
              throw new Error("high-water mark unavailable");
            }
            return undefined;
          },
        }),
        { mode: "incremental" },
      );

      expect(_statusesOf(report)).toEqual([
        ["a", "failed", "high-water mark unavailable"],
        ["b", "ok", undefined],
      ]);
    });

    it("fails a drive at a failed upsert and keeps its earlier pages", async () => {
      const listings = createInMemoryListingsStore();
      let upsertCalls = 0;
      const failingListings: ListingsStore = {
        ...listings,
        upsertRows: async (rows) => {
          upsertCalls += 1;
          if (upsertCalls === 2) {
            throw new Error("upsert failed");
          }
          return listings.upsertRows(rows);
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
        report.drives[0]?.status,
        report.drives[0]?.relationsWritten,
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

      expect([error.report.drives[0]?.error, _datasetIds(listings)]).toEqual([
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
        drives: [
          {
            driveKey: "a",
            window: { since: _at(0), until: undefined },
            connectionsFetched: 2,
            relationsWritten: 2,
            relationsUnchanged: 0,
            newestTimestamp: _at(2),
            status: "ok",
          },
        ],
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
