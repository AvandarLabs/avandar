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
