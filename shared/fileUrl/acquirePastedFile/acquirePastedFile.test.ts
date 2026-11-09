import { strToU8, zipSync } from "fflate";
import { describe, expect, it, vi } from "vitest";
import { acquirePastedFile } from "$/fileUrl/acquirePastedFile/acquirePastedFile.ts";
import { PrivateFileHostError } from "$/fileUrl/PrivateFileHostError.ts";

const CSV = strToU8("borough,doses\nManhattan,10\n");

function _ok(bytes: Uint8Array, headers: Record<string, string>): Response {
  return new Response(bytes, { status: 200, headers });
}

function _fetchFrom(
  routes: Record<string, Response>,
): typeof fetch {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    const response = routes[url];
    if (!response) {
      throw new Error(`No fixture for ${url}`);
    }
    return response;
  }) as typeof fetch;
}

const allowPublicHost = vi.fn(async () => {});

describe("acquirePastedFile", () => {
  it("downloads the raw file when a GitHub file page was pasted", async () => {
    const raw =
      "https://raw.githubusercontent.com/nychealth/immunization-data/main/geo/Main_Routine_Vaccine_Geo.csv";
    const fetchImpl = _fetchFrom({
      [raw]: _ok(CSV, { "content-type": "text/csv" }),
    });

    const acquired = await acquirePastedFile({
      url: "https://github.com/nychealth/immunization-data/blob/main/geo/Main_Routine_Vaccine_Geo.csv",
      fetch: fetchImpl,
      assertPublicHost: allowPublicHost,
    });

    expect(acquired).toMatchObject({
      outcome: "file",
      fileName: "Main_Routine_Vaccine_Geo.csv",
      mediaType: "text/csv",
      sourceLabel: "GitHub",
    });
    if (acquired.outcome === "file") {
      expect(Array.from(acquired.bytes)).toEqual(Array.from(CSV));
    }
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("refuses a host that resolves to a private address before fetching it", async () => {
    const fetchImpl = vi.fn();

    const acquired = await acquirePastedFile({
      url: "https://files.example.com/vaccines.csv",
      fetch: fetchImpl as typeof fetch,
      assertPublicHost: async () => {
        throw new PrivateFileHostError("files.example.com");
      },
    });

    expect(acquired).toEqual({ outcome: "error", reason: "private-address" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("refuses a redirect onto a private address", async () => {
    const fetchImpl = _fetchFrom({
      "https://files.example.com/vaccines.csv": new Response(null, {
        status: 302,
        headers: { location: "http://127.0.0.1/secret.csv" },
      }),
    });

    const acquired = await acquirePastedFile({
      url: "https://files.example.com/vaccines.csv",
      fetch: fetchImpl,
      assertPublicHost: async (host) => {
        if (host === "127.0.0.1") {
          throw new PrivateFileHostError(host);
        }
      },
    });

    expect(acquired).toEqual({ outcome: "error", reason: "private-address" });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("names a file that is larger than the download ceiling", async () => {
    const fetchImpl = _fetchFrom({
      "https://files.example.com/vaccines.csv": _ok(CSV, {
        "content-type": "text/csv",
        "content-length": "999999999",
      }),
    });

    const acquired = await acquirePastedFile({
      url: "https://files.example.com/vaccines.csv",
      fetch: fetchImpl,
      assertPublicHost: allowPublicHost,
      maxBytes: 16,
    });

    expect(acquired).toEqual({ outcome: "error", reason: "too-large" });
  });

  it("follows Drive's large-file confirmation page to the file", async () => {
    const page = "https://drive.google.com/uc?export=download&id=1AbC";
    const confirmed = `${page}&confirm=t`;
    const fetchImpl = _fetchFrom({
      [page]: _ok(strToU8("<html>uc-download-link confirm=t</html>"), {
        "content-type": "text/html",
      }),
      [confirmed]: _ok(CSV, {
        "content-type": "text/csv",
        "content-disposition": 'attachment; filename="vaccines.csv"',
      }),
    });

    const acquired = await acquirePastedFile({
      url: "https://drive.google.com/file/d/1AbC/view",
      fetch: fetchImpl,
      assertPublicHost: allowPublicHost,
    });

    expect(acquired).toMatchObject({
      outcome: "file",
      fileName: "vaccines.csv",
      sourceLabel: "Google Drive",
    });
  });

  it("asks which data file to import when a zip contains several", async () => {
    const zipped = zipSync({
      "geo/vaccines.csv": CSV,
      "geo/notes.csv": strToU8("a\n1\n"),
      "README.md": strToU8("hi"),
    });
    const fetchImpl = _fetchFrom({
      "https://files.example.com/drop.zip": _ok(zipped, {
        "content-type": "application/zip",
      }),
    });

    const acquired = await acquirePastedFile({
      url: "https://files.example.com/drop.zip",
      fetch: fetchImpl,
      assertPublicHost: allowPublicHost,
    });

    expect(acquired).toEqual({
      outcome: "choice",
      sourceLabel: "files.example.com",
      members: [
        {
          path: "geo/notes.csv",
          size: 4,
          mediaType: "text/csv",
        },
        {
          path: "geo/vaccines.csv",
          size: CSV.byteLength,
          mediaType: "text/csv",
        },
      ],
    });
  });

  it("returns the one data file inside a zip without asking", async () => {
    const zipped = zipSync({
      "geo/vaccines.csv": CSV,
      "README.md": strToU8("hi"),
    });
    const fetchImpl = _fetchFrom({
      "https://files.example.com/drop.zip": _ok(zipped, {
        "content-type": "application/zip",
      }),
    });

    const acquired = await acquirePastedFile({
      url: "https://files.example.com/drop.zip",
      fetch: fetchImpl,
      assertPublicHost: allowPublicHost,
    });

    expect(acquired).toMatchObject({
      outcome: "file",
      fileName: "vaccines.csv",
      mediaType: "text/csv",
    });
  });

  it("returns the archive member the person chose", async () => {
    const notes = strToU8("a\n1\n");
    const zipped = zipSync({
      "geo/vaccines.csv": CSV,
      "geo/notes.csv": notes,
    });
    const fetchImpl = _fetchFrom({
      "https://files.example.com/drop.zip": _ok(zipped, {
        "content-type": "application/zip",
      }),
    });

    const acquired = await acquirePastedFile({
      url: "https://files.example.com/drop.zip",
      memberPath: "geo/notes.csv",
      fetch: fetchImpl,
      assertPublicHost: allowPublicHost,
    });

    expect(acquired).toMatchObject({
      outcome: "file",
      fileName: "notes.csv",
    });
    if (acquired.outcome === "file") {
      expect(Array.from(acquired.bytes)).toEqual(Array.from(notes));
    }
  });

  it("lists CKAN resources without downloading them when there are several", async () => {
    const packageUrl =
      "https://data.humdata.org/api/3/action/package_show?id=cod-ab-afg";
    const fetchImpl = _fetchFrom({
      [packageUrl]: _ok(
        strToU8(
          JSON.stringify({
            success: true,
            result: {
              resources: [
                {
                  id: "1",
                  name: "Facilities",
                  format: "CSV",
                  url: "https://data.humdata.org/dataset/x/resource/1/download/facilities.csv",
                  size: 1200,
                },
                {
                  id: "2",
                  name: "Readme",
                  format: "TXT",
                  url: "https://data.humdata.org/dataset/x/resource/2/download/readme.txt",
                  size: 40,
                },
                {
                  id: "3",
                  name: "Map",
                  format: "XLSX",
                  url: "https://data.humdata.org/dataset/x/resource/3/download/map.xlsx",
                  size: 80,
                },
              ],
            },
          }),
        ),
        { "content-type": "application/json" },
      ),
    });

    const acquired = await acquirePastedFile({
      url: "https://data.humdata.org/dataset/cod-ab-afg",
      fetch: fetchImpl,
      assertPublicHost: allowPublicHost,
    });

    expect(acquired).toEqual({
      outcome: "choice",
      sourceLabel: "data.humdata.org",
      members: [
        {
          path: "Facilities",
          size: 1200,
          mediaType: "text/csv",
          url: "https://data.humdata.org/dataset/x/resource/1/download/facilities.csv",
        },
        {
          path: "Map",
          size: 80,
          mediaType:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          url: "https://data.humdata.org/dataset/x/resource/3/download/map.xlsx",
        },
      ],
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("refuses a Google Sheet without downloading it", async () => {
    const fetchImpl = vi.fn();

    const acquired = await acquirePastedFile({
      url: "https://docs.google.com/spreadsheets/d/1AbC/edit",
      fetch: fetchImpl as typeof fetch,
      assertPublicHost: allowPublicHost,
    });

    expect(acquired).toEqual({ outcome: "error", reason: "google-sheet" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("reports a link that is not a data file", async () => {
    const fetchImpl = _fetchFrom({
      "https://example.com/about": _ok(strToU8("<html>about</html>"), {
        "content-type": "text/html",
      }),
    });

    const acquired = await acquirePastedFile({
      url: "https://example.com/about",
      fetch: fetchImpl,
      assertPublicHost: allowPublicHost,
    });

    expect(acquired).toEqual({ outcome: "error", reason: "unsupported-type" });
  });
});
