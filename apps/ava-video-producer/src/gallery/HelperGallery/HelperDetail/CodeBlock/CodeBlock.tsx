import { useEffect, useState } from "react";
import { Icon } from "../../../MotionGallery/Icon";
import css from "./CodeBlock.module.css";
import type { ReactNode } from "react";

type Props = {
  code: string;
  isCopyable?: boolean;
};

/** How long the copy button reports success before resetting. */
const COPIED_MILLISECONDS = 1600;

/** A code sample, with a copy button when the reader is meant to paste it. */
export function CodeBlock({
  code,
  isCopyable = false,
}: Readonly<Props>): ReactNode {
  const [isCopied, setIsCopied] = useState(false);
  useEffect(
    function clearCopiedNoticeAfterDelay() {
      if (!isCopied) {
        return;
      }
      const timer = setTimeout(() => {
        return setIsCopied(false);
      }, COPIED_MILLISECONDS);
      return () => {
        return clearTimeout(timer);
      };
    },
    [isCopied],
  );
  const copy = () => {
    void navigator.clipboard?.writeText(code).then(() => {
      return setIsCopied(true);
    });
  };
  return (
    <div className={css.codeBlock}>
      <pre>
        <code>{code.trimEnd()}</code>
      </pre>
      {isCopyable ? (
        <button
          type="button"
          className={css.codeBlockCopyButton}
          onClick={copy}
          aria-label="Copy usage snippet"
        >
          <Icon name={isCopied ? "check" : "copy"} size={14} />
          <span aria-live="polite">{isCopied ? "Copied" : "Copy"}</span>
        </button>
      ) : null}
    </div>
  );
}
