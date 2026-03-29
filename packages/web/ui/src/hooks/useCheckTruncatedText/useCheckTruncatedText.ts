import { useIsomorphicEffect } from "@mantine/hooks";
import { isArray } from "@utils/guards/isArray/isArray";
import { DependencyList, useCallback, useState } from "react";
import type { RefCallback } from "react";

/**
 * Tracks whether text in a truncating element is visually clipped.
 *
 * @param dependencies Values that should re-run the truncation check.
 * @returns A ref callback for the text node and whether horizontal overflow
 *   is present.
 */
export function useCheckTruncatedText<T extends HTMLElement = HTMLElement>(
  dependencies: unknown | DependencyList = [],
): [textRef: RefCallback<T | null>, isTextTruncated: boolean] {
  const [element, setElement] = useState<T | null>(null);
  const [isTextTruncated, setIsTextTruncated] = useState(false);

  const dependencyList: DependencyList =
    isArray(dependencies) ? dependencies : [dependencies];

  const setTextNodeRef = useCallback((node: T | null) => {
    setElement((previous) => {
      return previous === node ? previous : node;
    });
    if (node === null) {
      setIsTextTruncated(false);
    }
  }, []);

  useIsomorphicEffect(() => {
    if (!element) {
      return;
    }

    const measure = (): void => {
      setIsTextTruncated(element.scrollWidth > element.clientWidth);
    };

    measure();

    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(element);

    return () => {
      resizeObserver.disconnect();
    };
  }, [element, ...dependencyList]);

  return [setTextNodeRef, isTextTruncated];
}
