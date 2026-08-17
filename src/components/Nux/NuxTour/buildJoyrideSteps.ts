import { nuxAnchorSelector } from "@/components/Nux/nuxAnchors";
import type { NuxMilestone } from "@/components/Nux/tutorials/NuxTutorial.types";
import type { I18n } from "@lingui/core";
import type { Step } from "react-joyride";

/**
 * Turns one milestone's declarative steps into Joyride steps.
 *
 * Takes `i18n` rather than a `t` function because the copy lives as `msg`
 * descriptors in a plain data module, which is the only form the Lingui
 * extractor can follow outside a component.
 *
 * `content` is left as a plain string here; `NuxTooltip` renders the title and
 * body itself, so Joyride's default chrome never ships.
 */
export function buildJoyrideSteps(options: {
  milestone: NuxMilestone;
  i18n: I18n;
}): Step[] {
  const { milestone, i18n } = options;
  return milestone.steps.map((step): Step => {
    return {
      target: nuxAnchorSelector(step.anchor),
      title: i18n._(step.title),
      content: i18n._(step.body),
      placement: step.placement,
      // Show the tooltip straight away rather than a beacon the user has to
      // find and click. Onboarding is opt-in already; a second opt-in per
      // step is friction with no benefit.
      skipBeacon: true,
      // Steps whose target only appears after the user acts declare their own
      // timeout; the rest keep Joyride's 1000ms default.
      ...(step.targetWaitTimeoutMs !== undefined ?
        { targetWaitTimeout: step.targetWaitTimeoutMs }
      : {}),
      data: { showSampleDownload: step.showSampleDownload === true },
    };
  });
}
