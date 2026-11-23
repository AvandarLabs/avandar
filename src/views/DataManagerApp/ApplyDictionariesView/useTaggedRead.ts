import { useEffect, useState } from "react";
import { Logger } from "@/utils/Logger";

/** Where a read tagged with a key has got to. */
export type TaggedRead<Result> =
  | { status: "reading" }
  | { status: "ready"; result: Result }
  | { status: "failed" };

/**
 * Runs `read` whenever `key` changes and keeps only the reply to the
 * current key, so a late reply never lands over a newer one. `key` must
 * stand for everything `read` reads; with no key nothing is read. A
 * failure is logged with `devMsg`.
 */
export function useTaggedRead<Result>(
  options: Readonly<{
    key: string | undefined;
    read: () => Promise<Result>;
    devMsg: string;
  }>,
): TaggedRead<Result> {
  const { key } = options;
  const [tagged, setTagged] = useState<{
    key: string | undefined;
    read: TaggedRead<Result>;
  }>({ key: undefined, read: { status: "reading" } });
  useEffect(() => {
    if (key === undefined) {
      return;
    }
    let isCurrent = true;
    options.read().then(
      (result) => {
        if (isCurrent) {
          setTagged({ key, read: { status: "ready", result } });
        }
      },
      (error: unknown) => {
        Logger.error(error, { devMsg: options.devMsg });
        if (isCurrent) {
          setTagged({ key, read: { status: "failed" } });
        }
      },
    );
    return () => {
      isCurrent = false;
    };
    // `key` stands for everything `read` reads.
    // oxlint-disable-next-line react/exhaustive-deps
  }, [key]);
  return tagged.key === key ? tagged.read : { status: "reading" };
}
