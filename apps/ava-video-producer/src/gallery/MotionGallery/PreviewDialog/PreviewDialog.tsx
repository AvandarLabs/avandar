import { useLingui as useGalleryLingui } from "@lingui/react/macro";
import React, { useEffect, useRef } from "react";
import { Icon } from "../Icon";
import { usePreviewKeys } from "../usePreviewKeys";
import styles from "./PreviewDialog.module.css";
import {
  PreviewDialogContent,
  type Props as ContentProps,
} from "./PreviewDialogContent";

/** Modal controls and motion-specific preview content. */
type Props = ContentProps & {
  onClose: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
};

function _trapDialogFocus(event: React.KeyboardEvent<HTMLDialogElement>) {
  if (event.key !== "Tab") {
    return;
  }
  const controls = Array.from(
    event.currentTarget.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex="0"]',
    ),
  ).filter((element) => element.getClientRects().length > 0);
  const first = controls[0];
  const last = controls[controls.length - 1];
  if (!first || !last) {
    event.preventDefault();
    return;
  }
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}
/** Keeps the modal and its focus stable while changing the displayed motion. */
export function PreviewDialog({
  onClose,
  onPrevious,
  onNext,
  ...contentProps
}: Readonly<Props>): React.ReactNode {
  const { t } = useGalleryLingui();
  const dialog = useRef<HTMLDialogElement>(null);
  const { preset } = contentProps;
  usePreviewKeys({ enabled: true, onPrevious, onNext });
  useEffect(function lockPageAndOpenDialog() {
    const node = dialog.current;
    const activeElement = document.activeElement;
    const focused =
      activeElement instanceof HTMLElement ||
      activeElement instanceof SVGElement
        ? activeElement
        : undefined;
    const priorOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    node?.showModal();
    return () => {
      node?.close();
      document.body.style.overflow = priorOverflow;
      focused?.focus({
        preventScroll: true,
      });
    };
  }, []);
  return (
    <dialog
      className="preview-dialog"
      ref={dialog}
      onKeyDown={_trapDialogFocus}
      aria-labelledby="dialog-title"
      aria-describedby="dialog-description"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          const bounds = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < bounds.left ||
            event.clientX > bounds.right ||
            event.clientY < bounds.top ||
            event.clientY > bounds.bottom
          ) {
            onClose();
          }
        }
      }}
    >
      <div className={`dialog-header ${styles.previewDialogHeader}`}>
        <div className={styles.previewDialogHeading}>
          <h2 id="dialog-title" aria-live="polite" title={preset.name}>
            {preset.name}
          </h2>
          <span>{preset.category}</span>
        </div>
        <div
          className={styles.previewDialogControls}
          role="group"
          aria-label={t`Preview controls`}
        >
          <button
            className="icon-button"
            onClick={onPrevious}
            disabled={!onPrevious}
            aria-label={t`Previous motion`}
            title={t`Previous motion`}
          >
            <Icon name="previous" />
          </button>
          <button
            className="icon-button"
            onClick={onNext}
            disabled={!onNext}
            aria-label={t`Next motion`}
            title={t`Next motion`}
          >
            <Icon name="arrow" />
          </button>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label={t`Close preview`}
            title={t`Close preview`}
            autoFocus
          >
            <Icon name="close" />
          </button>
        </div>
      </div>
      <PreviewDialogContent key={preset.id} {...contentProps} />
    </dialog>
  );
}
