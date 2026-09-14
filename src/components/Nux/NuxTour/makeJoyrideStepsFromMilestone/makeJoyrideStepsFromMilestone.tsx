import { Trans } from "@lingui/react";
import { Anchor } from "@mantine/core";
import { NuxAnchors } from "@/components/Nux/NuxAnchors/NuxAnchors";
import type { NuxAnchor } from "@/components/Nux/NuxAnchors/NuxAnchors";
import type { NuxEventName } from "@/components/Nux/NuxEvents/NuxEvents";
import type {
  NuxMilestone,
  NuxStep,
} from "@/components/Nux/tutorials/NuxTutorial.types";
import type { I18n } from "@lingui/core";
import type { ReactNode } from "react";
import type { Step } from "react-joyride";

/**
 * What a tour step stashes on Joyride's untyped `step.data`.
 *
 * Joyride types `data` as `any`, so this declaration is the only thing linking
 * the producer below to `NuxTooltip`, which reads it back.
 */
export type NuxJoyrideStepData = {
  disableNextUntilAnchor?: NuxAnchor;
  disableNextUntilEvent?: NuxEventName;
  hideBack?: boolean;
};

/**
 * Turns one milestone's declarative steps into Joyride steps.
 *
 * Takes `i18n` rather than a `t` function because the copy lives as `msg`
 * descriptors in a plain data module, which is the only form the Lingui
 * extractor can follow outside a component.
 *
 * Body copy is rendered here as `content` so `NuxTooltip` never has to know
 * about a particular step's links. Joyride's default chrome never ships.
 */
export function makeJoyrideStepsFromMilestone(options: {
  milestone: NuxMilestone;
  i18n: I18n;
}): Step[] {
  const { milestone, i18n } = options;
  return milestone.steps.map((step): Step => {
    const data: NuxJoyrideStepData = {
      ...(step.disableNextUntilAnchor !== undefined
        ? { disableNextUntilAnchor: step.disableNextUntilAnchor }
        : {}),
      ...(step.disableNextUntilEvent !== undefined
        ? { disableNextUntilEvent: step.disableNextUntilEvent }
        : {}),
      ...(step.hideBack === true ? { hideBack: true } : {}),
    };
    return {
      ..._passthroughJoyrideProps(step),
      title: i18n._(step.title),
      content: _contentFromStep(step),
      // Show the tooltip straight away rather than a beacon the user has to
      // find and click. Onboarding is opt-in already; a second opt-in per
      // step is friction with no benefit.
      skipBeacon: true,
      // Viewport-fixed so a flipped placement cannot extend document height
      // and create blank scroll space below the page.
      isFixed: true,
      // Skip zero-size copies (Puck's collapsed header menu sits at 0,0).
      target: _laidOutTarget(step.anchor),
      ...(step.spotlightAnchor !== undefined
        ? { spotlightTarget: _laidOutTarget(step.spotlightAnchor) }
        : {}),
      // Steps whose target only appears after the user acts declare their own
      // timeout; the rest keep Joyride's 1000ms default.
      ...(step.targetWaitTimeoutMs !== undefined
        ? { targetWaitTimeout: step.targetWaitTimeoutMs }
        : {}),
      // Joyride's own scroll is a 300ms tween. Combined with the overlay it
      // paints mid-flight, that tween stops short of the top. We jump the
      // nested scroller ourselves instead.
      ...(step.scrollParentToTop === true ? { skipScroll: true } : {}),
      ...(step.hideCaret === true || step.floatingOptions !== undefined
        ? {
            floatingOptions: {
              ...step.floatingOptions,
              ...(step.hideCaret === true ? { hideArrow: true } : {}),
            },
          }
        : {}),
      data,
    };
  });
}

/**
 * Joyride target that ignores 0×0 matches so the tooltip cannot park at the
 * viewport origin.
 */
function _laidOutTarget(anchor: NuxAnchor): () => HTMLElement | null {
  return () => {
    return NuxAnchors.queryLaidOut(anchor);
  };
}

/**
 * Joyride options declared on the tutorial step, with NUX-owned fields
 * stripped so they are not copied onto the Joyride `Step`.
 */
function _passthroughJoyrideProps(step: NuxStep): Partial<Step> {
  const {
    anchor: _anchor,
    spotlightAnchor: _spotlightAnchor,
    title: _title,
    body: _body,
    bodyLinkHref: _bodyLinkHref,
    disableNextUntilAnchor: _disableNextUntilAnchor,
    disableNextUntilEvent: _disableNextUntilEvent,
    targetWaitTimeoutMs: _targetWaitTimeoutMs,
    scrollParentToTop: _scrollParentToTop,
    hideBack: _hideBack,
    hideCaret: _hideCaret,
    openChatPanel: _openChatPanel,
    when: _when,
    ...joyrideProps
  } = step;
  return joyrideProps;
}

/**
 * Resolves a step body, turning `<0>` into a download link when an href is
 * set.
 */
function _contentFromStep(step: NuxStep): ReactNode {
  const components =
    step.bodyLinkHref === undefined
      ? undefined
      : {
          0: <Anchor href={step.bodyLinkHref} download size="sm" />,
        };
  return (
    <Trans
      id={step.body.id}
      message={step.body.message}
      components={components}
    />
  );
}
