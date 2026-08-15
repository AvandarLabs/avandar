import { IconChevronDown } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import css from "@/views/GisApp/panels/LayerInspector/InspectorSection/InspectorSection.module.css";
import type { ReactNode } from "react";

type Props = {
  title: string;

  /** A one-line summary shown on the right of the header while collapsed. */
  note?: string;

  defaultOpen?: boolean;

  /** Opens and focuses the section when this request id changes. */
  focusRequest?: number;
  children: ReactNode;
};

function _renderChevron(): ReactNode {
  return (
    <IconChevronDown
      className={css.inspectorSectionChevron}
      size={14}
      stroke={2}
    />
  );
}

/**
 * One collapsible inspector section.
 *
 * Content is hidden with CSS rather than unmounted: the Popup section
 * normalizes the layer's projection when it mounts, and collapsing it must
 * not leave the layer's query selecting nothing.
 */
export function InspectorSection({
  title,
  note,
  defaultOpen = false,
  focusRequest,
  children,
}: Props): ReactNode {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(
    function focusExternallyRequestedSection() {
      if (focusRequest === undefined) {
        return;
      }
      setIsOpen(true);
      toggleRef.current?.focus();
    },
    [focusRequest],
  );

  return (
    <div className={css.inspectorSection} data-open={isOpen}>
      <button
        ref={toggleRef}
        type="button"
        className={css.inspectorSectionToggle}
        aria-expanded={isOpen}
        onClick={() => {
          setIsOpen((current) => {
            return !current;
          });
        }}
      >
        {_renderChevron()}
        {title}
        {note ?
          <span className={css.inspectorSectionNote}>{note}</span>
        : null}
      </button>
      <div className={css.inspectorSectionContent}>{children}</div>
    </div>
  );
}
