import type { CkanResource } from "$/open-data/CkanClient/CkanClient.types.ts";

import { describe, expect, it } from "vitest";

import { buildCkanSourceVersion } from "$/open-data/buildCkanSourceVersion.ts";

const CONTENT_HASH = "32e316c0337f8a9b9117999a595f8e86";

function _resource(overrides: Partial<CkanResource>): CkanResource {
  return {
    id: "9da55974-adf5-4106-988c-d3c92333ea0a",
    name: "data.csv",
    format: "CSV",
    url: "https://data.humdata.org/dataset/d/resource/r/download/data.csv",
    url_type: "upload",
    size: 961,
    hash: CONTENT_HASH,
    last_modified: "2022-05-24T04:02:33.007599",
    mimetype: undefined,
    datastore_active: false,
    ...overrides,
  };
}

describe("buildCkanSourceVersion", () => {
  it("uses the content hash when the resource reports one", () => {
    expect(buildCkanSourceVersion(_resource({}))).toBe(
      `ckan:hash:${CONTENT_HASH}`,
    );
  });

  // A real older HDX resource reports `hash: ""`, not an absent field, so a
  // check that only tests for undefined would emit a token with nothing after
  // its prefix and compare equal for every such resource.
  it("falls back to modified time and size when the hash is an empty string", () => {
    expect(buildCkanSourceVersion(_resource({ hash: "" }))).toBe(
      "ckan:mtime:2022-05-24T04:02:33.007599:961",
    );
  });

  it("falls back on a whitespace-only hash too", () => {
    expect(buildCkanSourceVersion(_resource({ hash: "   " }))).toBe(
      "ckan:mtime:2022-05-24T04:02:33.007599:961",
    );
  });

  it("returns undefined when neither a hash nor a modified time is reported", () => {
    expect(
      buildCkanSourceVersion(_resource({ hash: "", last_modified: undefined })),
    ).toBeUndefined();
  });

  it("still builds a token when only the size is missing", () => {
    expect(
      buildCkanSourceVersion(_resource({ hash: "", size: undefined })),
    ).toBe("ckan:mtime:2022-05-24T04:02:33.007599:unknown");
  });

  // The prefix is what stops the two forms from ever comparing equal. Without
  // it, a resource whose hash happens to equal another's mtime string would
  // look unchanged.
  it("cannot produce the same token from a hash and from a modified time", () => {
    const collidingValue = "2022-05-24T04:02:33.007599:961";
    const fromHash = buildCkanSourceVersion(
      _resource({ hash: collidingValue }),
    );
    const fromModifiedTime = buildCkanSourceVersion(_resource({ hash: "" }));

    expect(fromHash).not.toBe(fromModifiedTime);
  });

  it("changes when the content hash changes", () => {
    expect(buildCkanSourceVersion(_resource({}))).not.toBe(
      buildCkanSourceVersion(
        _resource({ hash: "ffffffffffffffffffffffffffffffff" }),
      ),
    );
  });

  it("changes when the modified time changes and no hash is reported", () => {
    expect(buildCkanSourceVersion(_resource({ hash: "" }))).not.toBe(
      buildCkanSourceVersion(
        _resource({ hash: "", last_modified: "2026-01-01T00:00:00.000000" }),
      ),
    );
  });

  // The token becomes a component of a delimited cache key, so whitespace in it
  // would make that key ambiguous.
  it("contains no whitespace", () => {
    const token = buildCkanSourceVersion(_resource({ hash: "" }));

    expect(token).toBeDefined();
    expect(token).not.toMatch(/\s/);
  });
});
