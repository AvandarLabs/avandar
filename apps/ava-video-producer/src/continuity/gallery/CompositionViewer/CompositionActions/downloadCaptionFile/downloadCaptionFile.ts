import type { ExportTheme } from "../../../../../videoThemeEditor/themeDraft/themeDraft";

/** Options a caption download sends, the same ones its MP4 export sends. */
export type CaptionDownloadOptions = Readonly<{
  cameraMotion?: boolean;
  theme?: ExportTheme;
}>;

function _saveTextFile(text: string, fileName: string): void {
  const url = URL.createObjectURL(
    new Blob([text], { type: "text/plain;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/**
 * Downloads a film's captions timed by the options and theme its export
 * sends, unsaved edits included, through `POST /api/captions`. Throws when
 * the server refuses the request, so the caller can say so.
 */
export async function downloadCaptionFile(
  request: Readonly<{
    id: string;
    options: CaptionDownloadOptions;
    fetchFile?: (url: string, init: RequestInit) => Promise<Response>;
    saveFile?: (text: string, fileName: string) => void;
  }>,
): Promise<void> {
  const {
    id,
    options,
    fetchFile = (url, init) => fetch(url, init),
    saveFile = _saveTextFile,
  } = request;
  const response = await fetchFile("/api/captions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, options }),
  });
  if (!response.ok) {
    throw new Error(`Caption download failed with status ${response.status}`);
  }
  saveFile(await response.text(), `${id}-captions.srt`);
}
