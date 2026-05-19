/**
 * Module-scope picker for the next annotation's colour. The toolbar
 * sets this via swatch clicks; the overlay reads it when creating
 * a new annotation.
 *
 * Kept in its own file (not in PlanCanvasToolbar.tsx) so the
 * react-refresh rule doesn't complain about mixed exports.
 */

declare global {
  interface Window {
    __avandarAnnotationColor?: string;
  }
}

export function setAnnotationColor(color: string): void {
  window.__avandarAnnotationColor = color;
}

export function activeAnnotationColor(): string {
  return window.__avandarAnnotationColor ?? "#1c7ed6";
}
