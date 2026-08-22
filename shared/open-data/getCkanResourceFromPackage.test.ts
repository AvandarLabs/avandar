import type {
  CkanPackage,
  CkanResource,
} from "$/open-data/CkanClient/CkanClient.types.ts";
import type { OpenDataAcquisitionFailureCode } from "$/open-data/openDataErrors.ts";

import { describe, expect, it } from "vitest";

import { getCkanResourceFromPackage } from "$/open-data/getCkanResourceFromPackage.ts";
import { OpenDataAcquisitionFailed } from "$/open-data/openDataErrors.ts";

const BASE_URL = "https://data.humdata.org";
const README_ID = "435ed157-6f7a-4e8f-a63a-2aa177b9bd05";
const ARCHIVE_ID = "55a51014-0d27-49ae-bf92-c82a570c2c6c";
const CSV_ID = "9da55974-adf5-4106-988c-d3c92333ea0a";

function _resource(overrides: Partial<CkanResource>): CkanResource {
  return {
    id: CSV_ID,
    name: "data.csv",
    format: "CSV",
    url: "https://data.humdata.org/dataset/d/resource/r/download/data.csv",
    url_type: "upload",
    size: 235,
    hash: "32e316c0337f8a9b9117999a595f8e86",
    last_modified: "2026-08-18T08:44:07.360475",
    mimetype: undefined,
    datastore_active: false,
    ...overrides,
  };
}

/**
 * A dataset shaped like a real HDX one: a readme first, then an archive, then
 * the CSV. Selecting by position would pick the readme.
 */
function _readmeFirstPackage(): CkanPackage {
  return {
    id: "c3429f0e-651b-4788-bb2f-4adbf222c90e",
    name: "movement-range-maps",
    metadata_modified: "2025-11-19T10:29:46.280529",
    resources: [
      _resource({
        id: README_ID,
        name: "How To Understand This Data.txt",
        format: "TXT",
        size: 961,
        hash: "",
      }),
      _resource({
        id: ARCHIVE_ID,
        name: "movement-range-data.zip",
        format: "zip",
        size: 73054975,
      }),
      _resource({ id: CSV_ID }),
    ],
  };
}

function _failureCode(run: () => unknown): OpenDataAcquisitionFailureCode {
  try {
    run();
  } catch (caught) {
    if (OpenDataAcquisitionFailed.is(caught)) {
      return caught.failure.code;
    }
    throw caught;
  }
  throw new Error("expected the selection to be refused, but it succeeded");
}

describe("getCkanResourceFromPackage", () => {
  // The load-bearing test. A real HDX dataset lists a readme before its data,
  // so a positional fallback returns documentation instead of rows.
  it("selects the named resource from a dataset whose first resource is a readme", () => {
    const resource = getCkanResourceFromPackage({
      ckanPackage: _readmeFirstPackage(),
      ckanResourceId: CSV_ID,
      baseUrl: BASE_URL,
      expectedFormat: "CSV",
      maxBytes: 1_000_000,
    });

    expect(resource.id).toBe(CSV_ID);
    expect(resource.format).toBe("CSV");
  });

  it("accepts the named resource even when it is the first one", () => {
    const ckanPackage = _readmeFirstPackage();
    const resource = getCkanResourceFromPackage({
      ckanPackage: {
        ...ckanPackage,
        resources: [_resource({ id: CSV_ID }), ...ckanPackage.resources],
      },
      ckanResourceId: CSV_ID,
      baseUrl: BASE_URL,
      expectedFormat: "CSV",
      maxBytes: 1_000_000,
    });

    expect(resource.id).toBe(CSV_ID);
  });

  it("refuses a resource id the dataset does not list", () => {
    expect(
      _failureCode(() => {
        return getCkanResourceFromPackage({
          ckanPackage: _readmeFirstPackage(),
          ckanResourceId: "00000000-0000-0000-0000-000000000000",
          baseUrl: BASE_URL,
          expectedFormat: "CSV",
          maxBytes: 1_000_000,
        });
      }),
    ).toBe("resource-not-found");
  });

  it("refuses an upstream API resource rather than downloading it", () => {
    const ckanPackage = _readmeFirstPackage();
    expect(
      _failureCode(() => {
        return getCkanResourceFromPackage({
          ckanPackage: {
            ...ckanPackage,
            resources: [
              _resource({
                id: CSV_ID,
                url_type: "api",
                format: "JSON",
                url: "http://cerfgms-webapi.unocha.org/v1/hdxproject/all.json",
              }),
            ],
          },
          ckanResourceId: CSV_ID,
          baseUrl: BASE_URL,
          expectedFormat: "JSON",
          maxBytes: 1_000_000,
        });
      }),
    ).toBe("resource-is-remote-api");
  });

  it.each([
    ["zip", ARCHIVE_ID],
    ["TXT", README_ID],
  ])("refuses a %s resource, which is not a table", (format, id) => {
    expect(
      _failureCode(() => {
        return getCkanResourceFromPackage({
          ckanPackage: _readmeFirstPackage(),
          ckanResourceId: id,
          baseUrl: BASE_URL,
          expectedFormat: format,
          maxBytes: 100_000_000,
        });
      }),
    ).toBe("resource-format-unsupported");
  });

  it("refuses a resource whose live format no longer matches the catalog", () => {
    expect(
      _failureCode(() => {
        return getCkanResourceFromPackage({
          ckanPackage: _readmeFirstPackage(),
          ckanResourceId: CSV_ID,
          baseUrl: BASE_URL,
          expectedFormat: "Parquet",
          maxBytes: 1_000_000,
        });
      }),
    ).toBe("resource-format-changed");
  });

  it.each(["csv", "CSV", "Csv"])(
    "matches the format case-insensitively, for %s",
    (format) => {
      const resource = getCkanResourceFromPackage({
        ckanPackage: {
          ..._readmeFirstPackage(),
          resources: [_resource({ id: CSV_ID, format })],
        },
        ckanResourceId: CSV_ID,
        baseUrl: BASE_URL,
        expectedFormat: "CSV",
        maxBytes: 1_000_000,
      });

      expect(resource.id).toBe(CSV_ID);
    },
  );

  // The download URL arrives in CKAN's response, not from Avandar's catalog, so
  // it must not be able to choose which host is fetched. This matters most when
  // the fetch runs server-side, where it could otherwise reach hosts a browser
  // never could.
  it("refuses a resource served from a different host than the catalog names", () => {
    expect(
      _failureCode(() => {
        return getCkanResourceFromPackage({
          ckanPackage: {
            ..._readmeFirstPackage(),
            resources: [
              _resource({
                id: CSV_ID,
                url: "https://evil.example.com/dataset/d/resource/r/download/x.csv",
              }),
            ],
          },
          ckanResourceId: CSV_ID,
          baseUrl: BASE_URL,
          expectedFormat: "CSV",
          maxBytes: 1_000_000,
        });
      }),
    ).toBe("resource-host-mismatch");
  });

  // A host suffix must not satisfy the check, which a `endsWith` comparison
  // would have allowed.
  it("refuses a host that merely ends with the catalogued host", () => {
    expect(
      _failureCode(() => {
        return getCkanResourceFromPackage({
          ckanPackage: {
            ..._readmeFirstPackage(),
            resources: [
              _resource({
                id: CSV_ID,
                url: "https://evil-data.humdata.org/d/r/download/x.csv",
              }),
            ],
          },
          ckanResourceId: CSV_ID,
          baseUrl: BASE_URL,
          expectedFormat: "CSV",
          maxBytes: 1_000_000,
        });
      }),
    ).toBe("resource-host-mismatch");
  });

  it("refuses a resource served over plain http from the catalogued host", () => {
    expect(
      _failureCode(() => {
        return getCkanResourceFromPackage({
          ckanPackage: {
            ..._readmeFirstPackage(),
            resources: [
              _resource({
                id: CSV_ID,
                url: "http://data.humdata.org/d/r/download/x.csv",
              }),
            ],
          },
          ckanResourceId: CSV_ID,
          baseUrl: BASE_URL,
          expectedFormat: "CSV",
          maxBytes: 1_000_000,
        });
      }),
    ).toBe("resource-host-mismatch");
  });

  it("refuses a resource whose URL does not parse", () => {
    expect(
      _failureCode(() => {
        return getCkanResourceFromPackage({
          ckanPackage: {
            ..._readmeFirstPackage(),
            resources: [_resource({ id: CSV_ID, url: "not a url" })],
          },
          ckanResourceId: CSV_ID,
          baseUrl: BASE_URL,
          expectedFormat: "CSV",
          maxBytes: 1_000_000,
        });
      }),
    ).toBe("resource-host-mismatch");
  });

  it("accepts a matching host on a different port-free path", () => {
    const resource = getCkanResourceFromPackage({
      ckanPackage: {
        ..._readmeFirstPackage(),
        resources: [
          _resource({
            id: CSV_ID,
            url: "https://DATA.humdata.org/some/other/path.csv",
          }),
        ],
      },
      ckanResourceId: CSV_ID,
      baseUrl: BASE_URL,
      expectedFormat: "CSV",
      maxBytes: 1_000_000,
    });

    expect(resource.id).toBe(CSV_ID);
  });

  it("refuses a resource larger than the caller allows", () => {
    expect(
      _failureCode(() => {
        return getCkanResourceFromPackage({
          ckanPackage: {
            ..._readmeFirstPackage(),
            resources: [_resource({ id: CSV_ID, size: 2_000_000 })],
          },
          ckanResourceId: CSV_ID,
          baseUrl: BASE_URL,
          expectedFormat: "CSV",
          maxBytes: 1_000_000,
        });
      }),
    ).toBe("resource-too-large");
  });

  // A resource exactly at the limit is allowed, so the guard is a ceiling and
  // not an off-by-one that rejects the largest permitted resource.
  it("accepts a resource exactly at the limit", () => {
    const resource = getCkanResourceFromPackage({
      ckanPackage: {
        ..._readmeFirstPackage(),
        resources: [_resource({ id: CSV_ID, size: 1_000_000 })],
      },
      ckanResourceId: CSV_ID,
      baseUrl: BASE_URL,
      expectedFormat: "CSV",
      maxBytes: 1_000_000,
    });

    expect(resource.id).toBe(CSV_ID);
  });

  // An older upload can report no size at all. That is not a reason to refuse,
  // because the byte read still has the caller's ceiling behind it.
  it("accepts a resource that reports no size", () => {
    const resource = getCkanResourceFromPackage({
      ckanPackage: {
        ..._readmeFirstPackage(),
        resources: [_resource({ id: CSV_ID, size: undefined })],
      },
      ckanResourceId: CSV_ID,
      baseUrl: BASE_URL,
      expectedFormat: "CSV",
      maxBytes: 1_000_000,
    });

    expect(resource.id).toBe(CSV_ID);
  });

  // Refusal order matters: an unreadable format is a permanent property of the
  // resource, while size is a property of this caller's limit, so the format
  // answer is the more useful one to surface first.
  it("reports the unsupported format when a resource is both unreadable and oversized", () => {
    expect(
      _failureCode(() => {
        return getCkanResourceFromPackage({
          ckanPackage: _readmeFirstPackage(),
          ckanResourceId: ARCHIVE_ID,
          baseUrl: BASE_URL,
          expectedFormat: "zip",
          maxBytes: 1_000,
        });
      }),
    ).toBe("resource-format-unsupported");
  });
});
