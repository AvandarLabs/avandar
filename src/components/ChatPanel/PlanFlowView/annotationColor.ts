/**
 * Module-scope picker for the next annotation's colour. The toolbar sets this
 * via swatch clicks; the overlay reads it when creating a new annotation.
 *
 * Kept in its own file so the react-refresh rule does not complain about mixed
 * exports in the toolbar component.
 */

declare global {
  interface Window {
    __avandarAnnotationColor?: string;
  }
}

/** Sets the color used for the next annotation drawn on the plan canvas. */
export function setAnnotationColor(color: string): void {
  window.__avandarAnnotationColor = color;
}

/** Returns the active annotation color, falling back to the default swatch. */
export function activeAnnotationColor(): string {
  return window.__avandarAnnotationColor ?? "#1c7ed6";
}
