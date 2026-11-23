import type { TargetSnapshot } from "./measureAvandar.types";

/**
 * Runs inside the review page: reads the stage bounds and facts about each
 * element carrying `targetId`. Pass it to `page.evaluate`, so it must not
 * reference anything outside its own body.
 */
export function readTargetCandidatesInPage(
  targetId: string,
): TargetSnapshot | undefined {
  const stage = document.querySelector(".avandar-film");
  if (!stage) {
    return undefined;
  }
  const { x, y, right, bottom } = stage.getBoundingClientRect();
  const candidates = [...document.querySelectorAll("[data-video-target]")]
    .filter((element) => {
      return element.getAttribute("data-video-target") === targetId;
    })
    .map((element) => {
      const rect = element.getBoundingClientRect();
      const computed = getComputedStyle(element);
      const top = document.elementFromPoint(
        rect.x + rect.width / 2,
        rect.y + rect.height / 2,
      );
      return {
        rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        isHidden:
          rect.width <= 0 ||
          rect.height <= 0 ||
          computed.display === "none" ||
          computed.visibility === "hidden" ||
          Number(computed.opacity) === 0,
        isCanvasProjection:
          element.getAttribute("data-video-canvas-target") === "true" &&
          computed.pointerEvents === "none" &&
          top instanceof HTMLCanvasElement &&
          Boolean(element.parentElement?.contains(top)),
        occluder:
          top && !element.contains(top) && !top.contains(element)
            ? `${top.tagName}.${top.className}`
            : undefined,
      };
    });
  return { stage: { x, y, right, bottom }, candidates };
}
