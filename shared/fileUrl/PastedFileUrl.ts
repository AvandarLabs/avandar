/**
 * What a pasted link is allowed to become before anything is downloaded.
 *
 * Callers such as the upload field and the file-link fetcher share this so a
 * GitHub page and a portal page are classified once, the same way, on both
 * sides of the request.
 */
export type ResolvedPastedFileUrl =
  | {
      kind: "download";
      /** The URL to fetch. A page link has already been rewritten. */
      url: string;
      /** Present when the link itself names the file. */
      fileName: string | undefined;
      /** Shown while the download runs, such as "GitHub" or a hostname. */
      sourceLabel: string;
    }
  | {
      kind: "ckan-package";
      baseUrl: string;
      packageId: string;
      sourceLabel: string;
    }
  | {
      kind: "ckan-resource";
      baseUrl: string;
      packageId: string;
      resourceId: string;
      sourceLabel: string;
    }
  | {
      kind: "refuse";
      reason: PastedFileUrlRefusal;
    };

/**
 * A pasted link we will not fetch, because the address itself says it is not
 * one public data file.
 */
export type PastedFileUrlRefusal =
  | "not-a-url"
  | "unsupported-scheme"
  | "github-not-a-file"
  | "drive-folder"
  | "google-sheet"
  | "google-document"
  | "dropbox-folder";

/**
 * Largest body a pasted link may return. A public URL must not make the
 * server buffer an unbounded file, and the upload error names this ceiling.
 */
export const FILE_URL_MAX_BYTES = 128 * 1024 * 1024;
