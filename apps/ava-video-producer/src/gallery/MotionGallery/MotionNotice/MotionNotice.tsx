import { clsx } from "clsx";
import { Icon } from "../Icon";
import css from "./MotionNotice.module.css";
import type { MotionGalleryState } from "../useMotionGalleryState/useMotionGalleryState.types";
import type { ReactNode } from "react";

type Props = Pick<MotionGalleryState, "notice" | "selected">;
/** Announces copied references while no motion preview is open. */
export function MotionNotice({ notice, selected }: Readonly<Props>): ReactNode {
  return (
    <div
      className={clsx(
        css.motionNoticeToast,
        notice && !selected ? "is-visible" : "",
      )}
      role="status"
      aria-live="polite"
    >
      {!selected && notice ? (
        <>
          <Icon name="check" size={16} />
          {notice}
        </>
      ) : null}
    </div>
  );
}
