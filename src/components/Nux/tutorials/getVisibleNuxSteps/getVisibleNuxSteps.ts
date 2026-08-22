import type {
  NuxStep,
  NuxStepFacts,
} from "@/components/Nux/tutorials/NuxTutorial.types";

import { matchLiteral } from "@avandar/utils";

function _isNuxStepVisible(options: {
  step: NuxStep;
  facts: NuxStepFacts;
}): boolean {
  const { when } = options.step;
  return when === undefined
    ? true
    : matchLiteral(when, {
        explorerHasQueryResults: options.facts.explorerHasQueryResults,
        explorerHasNoQueryResults: !options.facts.explorerHasQueryResults,
        generalAccessIsWorkspace: options.facts.generalAccessIsWorkspace,
      });
}

/**
 * The tooltips a milestone should show right now, given live explorer facts.
 *
 * Steps with no `when` always appear. Conditional steps drop in or out as
 * facts change, so `activeStepIndex` is an index into this list, not the
 * static tutorial array.
 */
export function getVisibleNuxSteps(options: {
  steps: readonly NuxStep[];
  facts: NuxStepFacts;
}): NuxStep[] {
  return options.steps.filter((step) => {
    return _isNuxStepVisible({ step, facts: options.facts });
  });
}
