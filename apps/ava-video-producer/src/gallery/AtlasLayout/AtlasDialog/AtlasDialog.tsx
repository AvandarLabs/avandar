import { useEffect, useRef } from "react";
import { Icon } from "../../MotionGallery/Icon";
import { usePreviewKeys } from "../../MotionGallery/usePreviewKeys";
import css from "./AtlasDialog.module.css";
import type { ReactNode } from "react";

type Props = {
  title: string;
  /** Shown beside the title, for example the item's category. */
  subtitle?: string;
  /** Accessible names for the previous and next buttons. */
  previousLabel: string;
  nextLabel: string;
  /** Id of the element that describes the open item, if any. */
  describedBy?: string;
  onClose: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  children: ReactNode;
};

/** Keeps Tab inside the open dialog, wrapping at either end. */
function _trapDialogFocus(event: KeyboardEvent) {
  if (event.key !== "Tab") {
    return;
  }
  const dialogElement = event.currentTarget;
  if (!(dialogElement instanceof HTMLDialogElement)) {
    return;
  }
  const controls = Array.from(
    dialogElement.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), iframe, [tabindex="0"]',
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

/**
 * Opens as a modal on mount, locks page scroll, traps Tab focus, closes on
 * backdrop clicks, and restores focus to the card that opened it on close.
 */
function useModalDialog(onClose: () => void) {
  const dialog = useRef<HTMLDialogElement>(null);
  const latestOnClose = useRef(onClose);
  useEffect(() => {
    latestOnClose.current = onClose;
  });
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
    const onBackdropClick = (event: MouseEvent) => {
      if (!node || event.target !== node) {
        return;
      }
      const bounds = node.getBoundingClientRect();
      if (
        event.clientX < bounds.left ||
        event.clientX > bounds.right ||
        event.clientY < bounds.top ||
        event.clientY > bounds.bottom
      ) {
        latestOnClose.current();
      }
    };
    node?.addEventListener("keydown", _trapDialogFocus);
    node?.addEventListener("click", onBackdropClick);
    return () => {
      node?.removeEventListener("keydown", _trapDialogFocus);
      node?.removeEventListener("click", onBackdropClick);
      node?.close();
      document.body.style.overflow = priorOverflow;
      focused?.focus({ preventScroll: true });
    };
  }, []);
  return dialog;
}

/**
 * The Motion Atlas preview modal shared by every section: a title, previous
 * and next buttons (also bound to the arrow keys, including inside an
 * embedded player), and a close button. Escape and a backdrop click close it.
 */
export function AtlasDialog({
  title,
  subtitle,
  previousLabel,
  nextLabel,
  describedBy,
  onClose,
  onPrevious,
  onNext,
  children,
}: Props) {
  const dialog = useModalDialog(onClose);
  usePreviewKeys({ enabled: true, onPrevious, onNext, onClose, frame: dialog });
  return (
    <dialog
      className="preview-dialog"
      ref={dialog}
      aria-labelledby="dialog-title"
      aria-describedby={describedBy}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className={`dialog-header ${css.header}`}>
        <div className={css.heading}>
          <h2 id="dialog-title" aria-live="polite" title={title}>
            {title}
          </h2>
          {subtitle ? <span>{subtitle}</span> : null}
        </div>
        <div
          className={css.controls}
          role="group"
          aria-label="Preview controls"
        >
          <button
            type="button"
            className="icon-button"
            onClick={onPrevious}
            disabled={!onPrevious}
            aria-label={previousLabel}
            title={previousLabel}
          >
            <Icon name="previous" />
          </button>
          <button
            type="button"
            className="icon-button"
            onClick={onNext}
            disabled={!onNext}
            aria-label={nextLabel}
            title={nextLabel}
          >
            <Icon name="arrow" />
          </button>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="Close preview"
            title="Close preview"
            autoFocus
          >
            <Icon name="close" />
          </button>
        </div>
      </div>
      {children}
    </dialog>
  );
}
