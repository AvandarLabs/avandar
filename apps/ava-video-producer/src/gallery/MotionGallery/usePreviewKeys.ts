import { useEffect, type RefObject } from "react";

type Props = {
  enabled: boolean;
  onPrevious?: () => void;
  onNext?: () => void;
  onClose?: () => void;
  frame?: RefObject<HTMLElement | null>;
};

/** Browse previews with arrows while preserving native form-control keys. */
export function usePreviewKeys({
  enabled,
  onPrevious,
  onNext,
  onClose,
  frame,
}: Props) {
  useEffect(() => {
    if (!enabled) {
      return;
    }
    const navigate = (event: KeyboardEvent) =>
      _navigate(event, { enabled, onPrevious, onNext, onClose });
    window.addEventListener("keydown", navigate);
    const iframe = frame?.current?.querySelector("iframe");
    const listenInFrame = () =>
      iframe?.contentWindow?.addEventListener("keydown", navigate);
    listenInFrame();
    iframe?.addEventListener("load", listenInFrame);
    return () => {
      window.removeEventListener("keydown", navigate);
      iframe?.removeEventListener("load", listenInFrame);
      iframe?.contentWindow?.removeEventListener("keydown", navigate);
    };
  }, [enabled, onPrevious, onNext, onClose, frame]);
}

function _navigate(
  event: KeyboardEvent,
  { onPrevious, onNext, onClose }: Props,
) {
  if (event.defaultPrevented) {
    return;
  }
  if (event.key === "Escape" && onClose) {
    event.preventDefault();
    onClose();
    return;
  }
  const target = event.target as Element | null;
  if (
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey ||
    (typeof target?.closest === "function" &&
      target.closest(
        "input, select, textarea, [contenteditable=true], [role=slider], [role=listbox]",
      ))
  ) {
    return;
  }
  const action =
    event.key === "ArrowLeft"
      ? onPrevious
      : event.key === "ArrowRight"
        ? onNext
        : undefined;
  if (action) {
    event.preventDefault();
    action();
  }
}
