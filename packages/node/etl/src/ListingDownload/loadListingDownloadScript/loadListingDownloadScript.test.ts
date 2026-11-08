import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadListingDownloadScript } from "@etl/ListingDownload/loadListingDownloadScript/loadListingDownloadScript";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const LISTING = {
  id: "5b89fc55-586d-485f-8526-3c7a9a1b0d90",
  apiBaseUrl: "https://data.example.gov",
  apiResourceId: "abcd-1234",
  externalDatasetId: "abcd-1234",
  apiResourceFormat: "CSV",
};

describe("loadListingDownloadScript", () => {
  let configDir: string;

  beforeEach(async () => {
    configDir = await mkdtemp(join(tmpdir(), "listing-download-"));
  });

  afterEach(async () => {
    await rm(configDir, { force: true, recursive: true });
  });

  it("imports the script relative to the config's directory", async () => {
    await writeFile(
      join(configDir, "download.mjs"),
      [
        "export default async ({ listing }) => ({",
        "  paging: false,",
        "  url: `${listing.apiBaseUrl}/file.csv`,",
        '  contentKind: "csv",',
        "  sourceVersion: undefined,",
        "});",
      ].join("\n"),
      "utf8",
    );

    const script = await loadListingDownloadScript({
      download: { paging: false, script: "./download.mjs" },
      configDir,
    });

    await expect(script({ listing: LISTING })).resolves.toEqual({
      paging: false,
      url: "https://data.example.gov/file.csv",
      contentKind: "csv",
      sourceVersion: undefined,
    });
  });

  it("refuses a script that does not default-export a function", async () => {
    await writeFile(join(configDir, "download.mjs"), "export default 1;\n");

    await expect(
      loadListingDownloadScript({
        download: { paging: false, script: "./download.mjs" },
        configDir,
      }),
    ).rejects.toThrow(/download\.mjs must default-export a function/);
  });
});
