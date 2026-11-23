import { Stack } from "@mantine/core";
import { UploadedFileBar } from "@/views/DataManagerApp/DataImportView/ManualUploadView/UploadedFileBar/UploadedFileBar";
import { Motion } from "../../../src/motion";
import { ImportReviewFields } from "./ImportReviewFields";
import { useImportReview } from "./useImportReview";
import type { ReactNode } from "react";

type Props = {
  frame: number;
};
const _noop = () => {};
/**
 * The real import review form: the product's dataset-detail fields and preview,
 * typed out frame by frame.
 */
export function ImportReview({ frame }: Readonly<Props>): ReactNode {
  const { nameRef, descriptionRef, rootRef, file, copy, form } =
    useImportReview({ frame });

  return (
    <Stack
      gap="xl"
      style={Motion.enter({
        frame,
        at: 68,
        opts: { y: 10, dur: 18 },
      })}
    >
      <UploadedFileBar
        file={file}
        sourceType="csv_file"
        isBusy={false}
        onReplace={_noop}
      />
      <form
        ref={rootRef}
        onSubmit={(event) => {
          return event.preventDefault();
        }}
      >
        <ImportReviewFields
          nameRef={nameRef}
          descriptionRef={descriptionRef}
          copy={copy}
          form={form}
          frame={frame}
        />
      </form>
    </Stack>
  );
}
