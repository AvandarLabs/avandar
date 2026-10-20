import { useEffect, useRef, useState } from "react";

/** Keep one player mounted while its native dialog expands and restores focus. */
export function useExpandedPreview() {
  const [expanded, setExpanded] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const hasExpanded = useRef(false);
  const expandButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const node = dialog.current;
    if (!node) {
      return;
    }
    node.close();
    if (!expanded) {
      node.show();
      if (hasExpanded.current) {
        expandButton.current?.focus({ preventScroll: true });
      }
      return;
    }
    hasExpanded.current = true;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    node.showModal();
    return () => {
      node.close();
      document.body.style.overflow = overflow;
    };
  }, [expanded]);
  return { expanded, setExpanded, dialog, expandButton };
}
