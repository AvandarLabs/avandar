import { describe, expect, it } from "vitest";
import { resolvePastedFileUrl } from "$/fileUrl/resolvePastedFileUrl/resolvePastedFileUrl.ts";

describe("resolvePastedFileUrl", () => {
  it("rewrites a GitHub file page to the raw file and keeps the file name", () => {
    expect(
      resolvePastedFileUrl(
        "https://github.com/nychealth/immunization-data/blob/main/geo/Main_Routine_Vaccine_Geo.csv",
      ),
    ).toEqual({
      kind: "download",
      url: "https://raw.githubusercontent.com/nychealth/immunization-data/main/geo/Main_Routine_Vaccine_Geo.csv",
      fileName: "Main_Routine_Vaccine_Geo.csv",
      sourceLabel: "GitHub",
    });
  });

  it("rewrites a GitHub /raw/ link the same way as a file page", () => {
    expect(
      resolvePastedFileUrl(
        "https://github.com/nychealth/immunization-data/raw/main/geo/Main_Routine_Vaccine_Geo.csv",
      ),
    ).toEqual({
      kind: "download",
      url: "https://raw.githubusercontent.com/nychealth/immunization-data/main/geo/Main_Routine_Vaccine_Geo.csv",
      fileName: "Main_Routine_Vaccine_Geo.csv",
      sourceLabel: "GitHub",
    });
  });

  it("leaves a raw.githubusercontent.com link as the file to download", () => {
    const raw =
      "https://raw.githubusercontent.com/nychealth/immunization-data/main/geo/Main_Routine_Vaccine_Geo.csv";

    expect(resolvePastedFileUrl(raw)).toEqual({
      kind: "download",
      url: raw,
      fileName: "Main_Routine_Vaccine_Geo.csv",
      sourceLabel: "GitHub",
    });
  });

  it("refuses a GitHub folder or repository link", () => {
    expect(
      resolvePastedFileUrl(
        "https://github.com/nychealth/immunization-data/tree/main/geo",
      ),
    ).toEqual({ kind: "refuse", reason: "github-not-a-file" });
    expect(
      resolvePastedFileUrl("https://github.com/nychealth/immunization-data"),
    ).toEqual({ kind: "refuse", reason: "github-not-a-file" });
  });

  it("turns a Google Drive file link into a download and refuses a folder", () => {
    expect(
      resolvePastedFileUrl(
        "https://drive.google.com/file/d/1AbCDef_ghi/view?usp=sharing",
      ),
    ).toEqual({
      kind: "download",
      url: "https://drive.google.com/uc?export=download&id=1AbCDef_ghi",
      fileName: undefined,
      sourceLabel: "Google Drive",
    });
    expect(
      resolvePastedFileUrl("https://drive.google.com/open?id=1AbCDef_ghi"),
    ).toMatchObject({
      kind: "download",
      url: "https://drive.google.com/uc?export=download&id=1AbCDef_ghi",
    });
    expect(
      resolvePastedFileUrl(
        "https://drive.google.com/drive/folders/1AbCDef_ghi",
      ),
    ).toEqual({ kind: "refuse", reason: "drive-folder" });
  });

  it("refuses a Google Sheet and points a Doc or Slides deck aside", () => {
    expect(
      resolvePastedFileUrl(
        "https://docs.google.com/spreadsheets/d/1AbCDef_ghi/edit",
      ),
    ).toEqual({ kind: "refuse", reason: "google-sheet" });
    expect(
      resolvePastedFileUrl("https://docs.google.com/document/d/1AbCDef_ghi/edit"),
    ).toEqual({ kind: "refuse", reason: "google-document" });
    expect(
      resolvePastedFileUrl(
        "https://docs.google.com/presentation/d/1AbCDef_ghi/edit",
      ),
    ).toEqual({ kind: "refuse", reason: "google-document" });
  });

  it("rewrites a Dropbox file link to download and refuses a folder", () => {
    expect(
      resolvePastedFileUrl(
        "https://www.dropbox.com/scl/fi/abc123/vaccines.csv?rlkey=xyz&dl=0",
      ),
    ).toEqual({
      kind: "download",
      url: "https://www.dropbox.com/scl/fi/abc123/vaccines.csv?rlkey=xyz&dl=1",
      fileName: "vaccines.csv",
      sourceLabel: "Dropbox",
    });
    expect(
      resolvePastedFileUrl("https://www.dropbox.com/scl/fo/abc123/folder?dl=0"),
    ).toEqual({ kind: "refuse", reason: "dropbox-folder" });
  });

  it("rewrites a Socrata dataset page to that dataset's CSV", () => {
    expect(
      resolvePastedFileUrl(
        "https://data.cdc.gov/NNDSS/NNDSS-Table-I-malaria/9mfq-cb36",
      ),
    ).toEqual({
      kind: "download",
      url: "https://data.cdc.gov/resource/9mfq-cb36.csv",
      fileName: "NNDSS-Table-I-malaria.csv",
      sourceLabel: "data.cdc.gov",
    });
  });

  it("leaves a Socrata resource CSV as a direct download", () => {
    const csv = "https://data.cityofnewyork.us/resource/nuxx-hp7k.csv";

    expect(resolvePastedFileUrl(csv)).toEqual({
      kind: "download",
      url: csv,
      fileName: "nuxx-hp7k.csv",
      sourceLabel: "data.cityofnewyork.us",
    });
  });

  it("reads a CKAN or HDX dataset page as a package, and a download link as a file", () => {
    expect(
      resolvePastedFileUrl("https://data.humdata.org/dataset/cod-ab-afg"),
    ).toEqual({
      kind: "ckan-package",
      baseUrl: "https://data.humdata.org",
      packageId: "cod-ab-afg",
      sourceLabel: "data.humdata.org",
    });
    expect(
      resolvePastedFileUrl(
        "https://data.humdata.org/dataset/cod-ab-afg/resource/435ed157-aaaa-bbbb-cccc-ddddeeeeffff",
      ),
    ).toEqual({
      kind: "ckan-resource",
      baseUrl: "https://data.humdata.org",
      packageId: "cod-ab-afg",
      resourceId: "435ed157-aaaa-bbbb-cccc-ddddeeeeffff",
      sourceLabel: "data.humdata.org",
    });
    expect(
      resolvePastedFileUrl(
        "https://data.humdata.org/dataset/cod-ab-afg/resource/435ed157/download/fts.csv",
      ),
    ).toEqual({
      kind: "download",
      url: "https://data.humdata.org/dataset/cod-ab-afg/resource/435ed157/download/fts.csv",
      fileName: "fts.csv",
      sourceLabel: "data.humdata.org",
    });
  });

  it("keeps a direct file link and refuses a link that is not http", () => {
    expect(
      resolvePastedFileUrl("https://example.com/files/vaccines.csv?x=1"),
    ).toEqual({
      kind: "download",
      url: "https://example.com/files/vaccines.csv?x=1",
      fileName: "vaccines.csv",
      sourceLabel: "example.com",
    });
    expect(resolvePastedFileUrl("not a link")).toEqual({
      kind: "refuse",
      reason: "not-a-url",
    });
    expect(resolvePastedFileUrl("ftp://example.com/vaccines.csv")).toEqual({
      kind: "refuse",
      reason: "unsupported-scheme",
    });
  });
});
