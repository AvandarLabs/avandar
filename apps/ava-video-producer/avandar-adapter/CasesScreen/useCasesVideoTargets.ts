import { useLayoutEffect, useRef } from "react";
import { caseType } from "./CasesScreen.constants";
import type { RefObject } from "react";
/**
 * Attach film targets after the native case views have committed their layout.
 */
export function useCasesVideoTargets({
  frame,
}: Readonly<{ frame: number }>): RefObject<HTMLDivElement | null> {
  const root = useRef<HTMLDivElement>(null);
  useLayoutEffect(
    function markCasesVideoTargets() {
      const homeButton = [
        ...(root.current?.querySelectorAll("button") ?? []),
      ].find((button) => {
        return button.textContent?.startsWith(caseType.name);
      });
      homeButton?.setAttribute("data-video-target", "cases-type");
      const firstRecord = root.current?.querySelector(
        'a[data-record="HF-0001"]',
      );
      firstRecord?.setAttribute("data-video-target", "cases-record-001");
      root.current?.querySelectorAll('[role="listitem"]').forEach((item) => {
        if (item.textContent?.includes("supply_kits_delivered")) {
          item.setAttribute("data-video-target", "cases-visit-value");
        }
      });
    },
    [frame],
  );
  return root;
}
