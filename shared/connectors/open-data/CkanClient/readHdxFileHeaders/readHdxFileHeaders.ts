import { z } from "zod";

/** One sheet of an HDX file structure check, as far as headers go. */
const HdxCheckedSheetSchema = z.object({ headers: z.array(z.string()) });

/** One HDX file structure check entry that read a file's sheets. */
const HdxFileCheckSchema = z.object({
  hxl_proxy_response: z.object({ sheets: z.array(z.unknown()) }),
});

function _parseChecks(fsCheckInfo: unknown): readonly unknown[] {
  if (Array.isArray(fsCheckInfo)) {
    return fsCheckInfo;
  }
  if (typeof fsCheckInfo !== "string") {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(fsCheckInfo);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function _readCheckHeaders(check: unknown): string[] | undefined {
  const parsedCheck = HdxFileCheckSchema.safeParse(check);
  if (!parsedCheck.success) {
    return undefined;
  }
  const { sheets } = parsedCheck.data.hxl_proxy_response;
  if (sheets.length !== 1) {
    return undefined;
  }
  const parsedSheet = HdxCheckedSheetSchema.safeParse(sheets[0]);
  if (!parsedSheet.success || parsedSheet.data.headers.length === 0) {
    return undefined;
  }
  return parsedSheet.data.headers;
}

/**
 * Reads a file's column headers from an HDX resource's `fs_check_info`, the
 * log of the file structure checks HDX runs on each upload. HDX sends it as
 * a JSON string holding an array of checks, oldest first. The newest check
 * that read headers wins.
 *
 * @param fsCheckInfo - The resource's raw `fs_check_info`, in either form.
 * @returns The headers, or `undefined` when no check read exactly one sheet
 *   with a non-empty list of text headers, such as a workbook with several
 *   sheets or a file HDX never checked.
 */
export function readHdxFileHeaders(fsCheckInfo: unknown): string[] | undefined {
  return _parseChecks(fsCheckInfo)
    .map(_readCheckHeaders)
    .findLast((headers) => {
      return headers !== undefined;
    });
}
