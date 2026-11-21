import { useLayoutEffect, useState } from "react";
import { delayRender, continueRender } from "remotion";
/** Hold rendering until fonts and frame-controlled product layouts settle. */
export function useAvandarStageLayout({
  frame,
}: Readonly<{ frame: number }>): void {
  const [initialHandle] = useState(() => {
    return delayRender("Avandar product fonts and initial layout");
  });
  useLayoutEffect(
    function delayUntilFontsReady() {
      let alive = true;
      document.fonts.ready.then(() => {
        if (alive) {
          continueRender(initialHandle);
        }
      });
      return () => {
        alive = false;
        continueRender(initialHandle);
      };
    },
    [initialHandle],
  );
  // AG Grid, CodeMirror and ResizeObserver need layout to settle after a seek.
  useLayoutEffect(
    function delayUntilControlledLayoutSettles() {
      const handle = delayRender("Avandar controlled component layout");
      const timer = setTimeout(() => {
        return continueRender(handle);
      }, 100);
      return () => {
        clearTimeout(timer);
        continueRender(handle);
      };
    },
    [frame],
  );
}
