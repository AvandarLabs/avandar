import { useLayoutEffect, useMemo, useRef } from "react";
import { useDatasetImportCopy } from "@/views/DataManagerApp/DataImportView/DatasetImportForm/useDatasetImportCopy";
import { columns } from "../importFixtures";
import { getImportReviewForm } from "./getImportReviewForm";
import type { RefObject } from "react";
/** Stable import refs, native copy and the controlled fixture form. */
type ImportReviewState = {
  nameRef: RefObject<HTMLInputElement | null>;
  descriptionRef: RefObject<HTMLInputElement | null>;
  rootRef: RefObject<HTMLFormElement | null>;
  file: File;
  copy: ReturnType<typeof useDatasetImportCopy>;
  form: ReturnType<typeof getImportReviewForm>;
};
/**
 * Hold stable product refs and file identity while sampling typed form state.
 */
export function useImportReview({
  frame,
}: Readonly<{ frame: number }>): ImportReviewState {
  const nameRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLFormElement>(null);
  const file = useMemo(() => {
    return new File([new Uint8Array(26703)], "cases.csv", { type: "text/csv" });
  }, []);
  const copy = useDatasetImportCopy({
    numColumns: columns.length,
    numPreviewRows: 200,
  });
  const form = getImportReviewForm({ frame });
  useLayoutEffect(() => {
    rootRef.current
      ?.querySelector('button[type="submit"]')
      ?.setAttribute("data-video-target", "import-save");
  });
  return { nameRef, descriptionRef, rootRef, file, copy, form };
}
