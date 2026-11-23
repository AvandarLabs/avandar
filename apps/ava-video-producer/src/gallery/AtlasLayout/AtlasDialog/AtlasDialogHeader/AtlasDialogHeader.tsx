import { clsx } from "clsx";
import { AtlasDialogControls } from "../AtlasDialogControls/AtlasDialogControls";
import css from "./AtlasDialogHeader.module.css";
import type { ReactNode } from "react";

type Props = {
  title: string;
  subtitle?: string;
  previousLabel: string;
  nextLabel: string;
  onPrevious?: () => void;
  onNext?: () => void;
  onClose: () => void;
};
/** Names the current entry and presents the AtlasDialog controls. */
export function AtlasDialogHeader({
  title,
  subtitle,
  previousLabel,
  nextLabel,
  onPrevious,
  onNext,
  onClose,
}: Readonly<Props>): ReactNode {
  return (
    <div
      className={clsx(
        css.atlasDialogHeaderDialogHeader,
        css.atlasDialogHeaderHeader,
      )}
    >
      <div className={css.atlasDialogHeaderHeading}>
        <h2 id="dialog-title" aria-live="polite" title={title}>
          {title}
        </h2>
        {subtitle ? <span>{subtitle}</span> : null}
      </div>
      <AtlasDialogControls
        {...{ previousLabel, nextLabel, onPrevious, onNext, onClose }}
      />
    </div>
  );
}
