/**
 * Joyride remount generation for the current step's laid-out target.
 *
 * Joyride captures an HTMLElement on first find. Puck remounts the Share
 * control after that, and measuring the detached node parks the tooltip at
 * the viewport origin. Bump only when a new laid-out node replaces one we
 * already used. A missing node is a gap in that replacement, not a remount.
 */
export function nextNuxJoyrideTargetEpoch<T>(options: {
  previousTarget: T | null;
  nextTarget: T | null;
  epoch: number;
}): number {
  const shouldKeepEpoch =
    options.nextTarget === null ||
    options.previousTarget === options.nextTarget ||
    options.previousTarget === null;
  return shouldKeepEpoch ? options.epoch : options.epoch + 1;
}
