import { SegmentedControl as MantineSegmentedControl } from "@mantine/core";
import { useCallback, useEffect, useState } from "react";
import type { ComponentProps, ReactNode, Ref } from "react";

type Props = ComponentProps<typeof MantineSegmentedControl>;

function _setRef(ref: Ref<HTMLDivElement> | undefined, node: HTMLDivElement) {
  if (typeof ref === "function") {
    ref(node);
  } else if (ref) {
    ref.current = node;
  }
}

/**
 * True when `event` is the end of an ancestor's `transform` transition, such
 * as the scale of a modal opening, which changes where `root` is drawn
 * without changing its size.
 */
function _isTransformEnd(event: Event): boolean {
  return "propertyName" in event && event.propertyName === "transform";
}

function _isAncestorTransformEnd(options: {
  event: Event;
  root: HTMLElement;
}): boolean {
  const { event, root } = options;
  return (
    _isTransformEnd(event) &&
    event.target instanceof Node &&
    event.target !== root &&
    event.target.contains(root)
  );
}

/**
 * Mantine's `SegmentedControl` with its selection indicator kept under the
 * selected label inside a modal. Mantine places the indicator from the
 * label's measured rectangle and measures again only when the label or the
 * control changes size. A control that mounts while its modal is still
 * scaling in is measured while scaled, and no resize follows when the scale
 * ends, so the indicator stays offset and too small. This component mounts
 * the control again when an ancestor's `transform` transition ends, which
 * measures it at its final size.
 */
export function SegmentedControl({ ref, ...others }: Props): ReactNode {
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  const [measureCount, setMeasureCount] = useState(0);

  useEffect(() => {
    if (root === null) {
      return undefined;
    }
    const handleTransitionEnd = (event: Event): void => {
      if (_isAncestorTransformEnd({ event, root })) {
        setMeasureCount((count) => {
          return count + 1;
        });
      }
    };
    document.addEventListener("transitionend", handleTransitionEnd, true);
    return () => {
      document.removeEventListener("transitionend", handleTransitionEnd, true);
    };
  }, [root]);

  const setRootRef = useCallback(
    (node: HTMLDivElement | null) => {
      setRoot(node);
      if (node !== null) {
        _setRef(ref, node);
      }
    },
    [ref],
  );

  return (
    <MantineSegmentedControl key={measureCount} {...others} ref={setRootRef} />
  );
}
