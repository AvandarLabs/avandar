import { createContext, useContext, useEffect, useRef } from "react";

/**
 * Whether the token row around a control has a resolver problem. `TokenRow`
 * provides it, and the shared inputs read it to show Mantine's error state,
 * which also marks the input `aria-invalid`.
 */
export const RowIssueContext = createContext(false);

/** True inside a token row whose value does not resolve. */
export function useRowHasIssue(): boolean {
  return useContext(RowIssueContext);
}

/**
 * The ARIA props that mark a control invalid. For controls that have no
 * Mantine error state, such as a segmented control.
 */
export function buildIssueAriaProps(
  hasIssue: boolean,
): Readonly<{ "aria-invalid"?: true }> {
  return hasIssue ? { "aria-invalid": true } : {};
}

/** Spread-ready `aria-invalid` for a control inside a token row. */
export function useRowIssueAriaProps(): Readonly<{ "aria-invalid"?: true }> {
  return buildIssueAriaProps(useRowHasIssue());
}

type SliderRoot = Readonly<{
  querySelector: (selector: string) => {
    setAttribute: (name: string, value: string) => void;
    removeAttribute: (name: string) => void;
  } | null;
}>;

/**
 * Sets or clears `aria-invalid` on the thumb inside a Mantine slider. The
 * slider drops unknown props before they reach its thumb, so the attribute is
 * written on the thumb element directly.
 */
export function markSliderThumbInvalid(
  root: SliderRoot | null,
  isInvalid: boolean,
): void {
  const thumb = root?.querySelector('[role="slider"]');
  if (!thumb) {
    return;
  }
  if (isInvalid) {
    thumb.setAttribute("aria-invalid", "true");
  } else {
    thumb.removeAttribute("aria-invalid");
  }
}

/**
 * A ref for a Mantine slider that keeps its thumb's `aria-invalid` in step
 * with the token row's issue state.
 */
export function useSliderIssueRef(): React.RefObject<HTMLDivElement | null> {
  const hasIssue = useRowHasIssue();
  const sliderRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    markSliderThumbInvalid(sliderRef.current, hasIssue);
  }, [hasIssue]);
  return sliderRef;
}
