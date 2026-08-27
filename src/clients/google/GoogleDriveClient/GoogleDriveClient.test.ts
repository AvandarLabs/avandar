import { describe, expect, it } from "vitest";
import {
  getGoogleSheetVersion,
  getGoogleSheetXlsxExport,
} from "@/clients/google/GoogleDriveClient/GoogleDriveClient";
import { GoogleDriveError } from "@/clients/google/GoogleDriveClient/GoogleDriveError";
import type { GoogleDriveFetch } from "@/clients/google/GoogleDriveClient/GoogleDriveClient.types";
import type { GoogleDriveErrorCode } from "@/clients/google/GoogleDriveClient/GoogleDriveError";

const FILE_ID = "1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789";
const ACCESS_TOKEN = "ya29.test-access-token";
const WORKBOOK_BYTES = Uint8Array.from([
  0x50, 0x4b, 0x03, 0x04, 0x00, 0xff,
]) as Uint8Array<ArrayBuffer>;

type RecordedRequest = { url: string; headers: Record<string, string> };

/**
 * A transport that records every request and answers from a queue.
 *
 * The queue is what makes the call-ordering assertions possible: an export
 * issues two requests, and pairing the recorded order against the responses
 * consumed shows which one went first.
 */
function _makeRecordingFetch(responses: Response[]): {
  driveFetch: GoogleDriveFetch;
  requests: RecordedRequest[];
} {
  const requests: RecordedRequest[] = [];
  const queue = [...responses];

  return {
    requests,
    driveFetch: async (url, init) => {
      requests.push({ url, headers: { ...init.headers } });
      const response = queue.shift();
      if (!response) {
        throw new Error(`No queued response for request to ${url}`);
      }
      return response;
    },
  };
}

function _versionResponse(version: string): Response {
  return new Response(JSON.stringify({ version }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function _workbookResponse(
  bytes: Uint8Array<ArrayBuffer> = WORKBOOK_BYTES,
): Response {
  return new Response(bytes, { status: 200 });
}

function _driveErrorResponse(status: number, reason?: string): Response {
  const body =
    reason === undefined ?
      JSON.stringify({ error: { code: status } })
    : JSON.stringify({
        error: { code: status, errors: [{ domain: "global", reason }] },
      });
  return new Response(body, {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("getGoogleSheetVersion", () => {
  it("asks Drive for only the version field", async () => {
    const { driveFetch, requests } = _makeRecordingFetch([
      _versionResponse("42"),
    ]);

    await getGoogleSheetVersion({
      fileId: FILE_ID,
      accessToken: ACCESS_TOKEN,
      driveFetch,
    });

    expect(requests).toHaveLength(1);
    expect(requests[0]!.url).toBe(
      `https://www.googleapis.com/drive/v3/files/${FILE_ID}` +
        "?fields=version&supportsAllDrives=true",
    );
  });

  it("declares shared drive support on both requests", async () => {
    // Drive v3 defaults `supportsAllDrives` to false, and a request that omits
    // it answers 404 `notFound` for a file that lives in a shared drive. That
    // is indistinguishable from a revoked per-file grant, so omitting it told
    // the user to re-pick a sheet they had just picked.
    const { driveFetch, requests } = _makeRecordingFetch([
      _versionResponse("42"),
      _workbookResponse(),
    ]);

    await getGoogleSheetXlsxExport({
      fileId: FILE_ID,
      accessToken: ACCESS_TOKEN,
      driveFetch,
    });

    expect(requests).toHaveLength(2);
    requests.forEach((request) => {
      expect(request.url).toContain("supportsAllDrives=true");
    });
  });

  it("sends the token as a bearer Authorization header", async () => {
    const { driveFetch, requests } = _makeRecordingFetch([
      _versionResponse("42"),
    ]);

    await getGoogleSheetVersion({
      fileId: FILE_ID,
      accessToken: ACCESS_TOKEN,
      driveFetch,
    });

    expect(requests[0]!.headers).toEqual({
      Authorization: `Bearer ${ACCESS_TOKEN}`,
    });
  });

  it("returns the version as the string Drive sent, not as a number", async () => {
    // The token is opaque and compared only for equality. `Number()` would pass
    // a loose `==` comparison while silently losing precision on the int64
    // Drive documents, so the type is asserted and not just the value.
    const { driveFetch } = _makeRecordingFetch([
      _versionResponse("9007199254740993"),
    ]);

    const version = await getGoogleSheetVersion({
      fileId: FILE_ID,
      accessToken: ACCESS_TOKEN,
      driveFetch,
    });

    expect(version).toBe("9007199254740993");
    expect(typeof version).toBe("string");
  });

  it("fails when Drive answers 200 without a version field", async () => {
    const { driveFetch } = _makeRecordingFetch([
      new Response(JSON.stringify({}), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    ]);

    await expect(
      getGoogleSheetVersion({
        fileId: FILE_ID,
        accessToken: ACCESS_TOKEN,
        driveFetch,
      }),
    ).rejects.toThrow(GoogleDriveError);
  });
});

describe("getGoogleSheetXlsxExport", () => {
  it("asks Drive to export the workbook as xlsx", async () => {
    const { driveFetch, requests } = _makeRecordingFetch([
      _versionResponse("42"),
      _workbookResponse(),
    ]);

    await getGoogleSheetXlsxExport({
      fileId: FILE_ID,
      accessToken: ACCESS_TOKEN,
      driveFetch,
    });

    expect(requests[1]!.url).toBe(
      `https://www.googleapis.com/drive/v3/files/${FILE_ID}/export` +
        "?mimeType=application%2Fvnd.openxmlformats-officedocument.spreadsheetml.sheet" +
        "&supportsAllDrives=true",
    );
    expect(requests[1]!.headers).toEqual({
      Authorization: `Bearer ${ACCESS_TOKEN}`,
    });
  });

  it("returns the response body unchanged, byte for byte", async () => {
    const { driveFetch } = _makeRecordingFetch([
      _versionResponse("42"),
      _workbookResponse(),
    ]);

    const { xlsxBytes } = await getGoogleSheetXlsxExport({
      fileId: FILE_ID,
      accessToken: ACCESS_TOKEN,
      driveFetch,
    });

    expect(Array.from(xlsxBytes)).toEqual(Array.from(WORKBOOK_BYTES));
  });

  it("reads the version before requesting the export", async () => {
    // Ordering is a correctness decision, not a style one. Reading the version
    // afterwards would pair stale bytes with a new version, which a cache reads
    // as current and serves. This ordering can only pair fresh bytes with an
    // old version, which costs one extra export and never wrong rows.
    const { driveFetch, requests } = _makeRecordingFetch([
      _versionResponse("42"),
      _workbookResponse(),
    ]);

    await getGoogleSheetXlsxExport({
      fileId: FILE_ID,
      accessToken: ACCESS_TOKEN,
      driveFetch,
    });

    expect(requests).toHaveLength(2);
    expect(requests[0]!.url).toContain("fields=version");
    expect(requests[1]!.url).toContain("/export");
  });

  it("reports the version from that same read rather than reading it twice", async () => {
    const { driveFetch, requests } = _makeRecordingFetch([
      _versionResponse("42"),
      _workbookResponse(),
    ]);

    const { sourceVersion } = await getGoogleSheetXlsxExport({
      fileId: FILE_ID,
      accessToken: ACCESS_TOKEN,
      driveFetch,
    });

    expect(sourceVersion).toBe("42");
    expect(
      requests.filter((request) => {
        return request.url.includes("fields=version");
      }),
    ).toHaveLength(1);
  });

  it("escapes a file id that would otherwise change the request path", async () => {
    const { driveFetch, requests } = _makeRecordingFetch([
      _versionResponse("42"),
      _workbookResponse(),
    ]);

    await getGoogleSheetXlsxExport({
      fileId: "a/../b?x=1",
      accessToken: ACCESS_TOKEN,
      driveFetch,
    });

    expect(requests[0]!.url).toBe(
      "https://www.googleapis.com/drive/v3/files/a%2F..%2Fb%3Fx%3D1" +
        "?fields=version&supportsAllDrives=true",
    );
  });
});

describe("Drive error mapping", () => {
  const cases: Array<{
    label: string;
    status: number;
    reason?: string;
    code: GoogleDriveErrorCode;
  }> = [
    {
      label: "the Drive API is not enabled on the project",
      status: 403,
      reason: "accessNotConfigured",
      code: "drive-api-not-configured",
    },
    {
      label: "the export exceeds Drive's size ceiling",
      status: 403,
      reason: "exportSizeLimitExceeded",
      code: "export-too-large",
    },
    {
      label: "the file is gone or the per-file grant was withdrawn",
      status: 404,
      code: "file-not-accessible",
    },
    {
      label: "the app has no permission on the file",
      status: 403,
      reason: "insufficientFilePermissions",
      code: "file-not-accessible",
    },
    {
      label: "the token is expired or revoked",
      status: 401,
      code: "google-auth-expired",
    },
    {
      label: "Drive is throttling by status",
      status: 429,
      code: "rate-limited",
    },
    {
      label: "Drive is throttling by reason",
      status: 403,
      reason: "userRateLimitExceeded",
      code: "rate-limited",
    },
    {
      label: "Drive fails in a way this module does not recognize",
      status: 500,
      code: "unknown",
    },
    {
      label: "Drive sends a 403 with a reason this module does not recognize",
      status: 403,
      reason: "somethingNewFromGoogle",
      code: "unknown",
    },
  ];

  cases.forEach((testCase) => {
    it(`maps ${testCase.label} to ${testCase.code}`, async () => {
      const { driveFetch } = _makeRecordingFetch([
        _driveErrorResponse(testCase.status, testCase.reason),
      ]);

      const error = await getGoogleSheetVersion({
        fileId: FILE_ID,
        accessToken: ACCESS_TOKEN,
        driveFetch,
      }).catch((thrown: unknown) => {
        return thrown;
      });

      expect(error).toBeInstanceOf(GoogleDriveError);
      expect((error as GoogleDriveError).code).toBe(testCase.code);
      expect((error as GoogleDriveError).status).toBe(testCase.status);
    });
  });

  it("does not throw on a successful response", () => {
    // Positive control for every case above. An implementation that threw
    // unconditionally would satisfy all of them and fail only here.
    const { driveFetch } = _makeRecordingFetch([_versionResponse("42")]);

    return expect(
      getGoogleSheetVersion({
        fileId: FILE_ID,
        accessToken: ACCESS_TOKEN,
        driveFetch,
      }),
    ).resolves.toBe("42");
  });

  it("still maps a status when Drive's error body is not JSON", async () => {
    // `files.export` answers with a raw body, so a non-JSON error body is an
    // ordinary case. The status alone must still map.
    const { driveFetch } = _makeRecordingFetch([
      new Response("<html>Not found</html>", { status: 404 }),
    ]);

    const error = await getGoogleSheetVersion({
      fileId: FILE_ID,
      accessToken: ACCESS_TOKEN,
      driveFetch,
    }).catch((thrown: unknown) => {
      return thrown;
    });

    expect((error as GoogleDriveError).code).toBe("file-not-accessible");
    expect((error as GoogleDriveError).reason).toBeUndefined();
  });

  it("does not request the export when the version read fails", async () => {
    // Otherwise a revoked grant costs two failing calls instead of one, and an
    // oversized export would be attempted against a file we cannot even see.
    const { driveFetch, requests } = _makeRecordingFetch([
      _driveErrorResponse(404),
    ]);

    await expect(
      getGoogleSheetXlsxExport({
        fileId: FILE_ID,
        accessToken: ACCESS_TOKEN,
        driveFetch,
      }),
    ).rejects.toBeInstanceOf(GoogleDriveError);

    expect(requests).toHaveLength(1);
  });
});
