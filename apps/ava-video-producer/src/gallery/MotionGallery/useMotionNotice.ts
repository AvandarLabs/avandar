import { useCallback, useEffect, useRef, useState } from "react";
import { copyTextToClipboard } from "../copyTextToClipboard";
import type { Dispatch, SetStateAction } from "react";

type MotionNotice = {
  notice: string;
  setNotice: Dispatch<SetStateAction<string>>;
  onCopy: (value: string, label: string) => Promise<void>;
};
/** Reports gallery copy outcomes and owns their existing timed dismissal. */
export function useMotionNotice(): MotionNotice {
  const [notice, setNotice] = useState("");
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const cancelDismissal = useCallback(() => {
    clearTimeout(noticeTimer.current);
  }, []);
  useEffect(
    function clearNoticeDismissalOnUnmount() {
      return cancelDismissal;
    },
    [cancelDismissal],
  );
  const announce = useCallback(
    (message: string) => {
      setNotice(message);
      cancelDismissal();
      noticeTimer.current = setTimeout(() => {
        return setNotice("");
      }, 4200);
    },
    [cancelDismissal],
  );
  const onCopy = useCallback(
    async (value: string, label: string) => {
      try {
        await copyTextToClipboard({ value, label: "Text to copy" });
        announce(label);
      } catch {
        announce(
          "Copy unavailable. Select the reference text and copy it manually.",
        );
      }
    },
    [announce],
  );
  return { notice, setNotice, onCopy };
}
