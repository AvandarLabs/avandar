import { msg } from "@lingui/core/macro";
import { IconChartBar } from "@tabler/icons-react";

/**
 * A chat result's header copy and icon, in the gadget card's shape. Shared
 * by the result card and the placeholder shown while the card loads, so
 * both draw the same header.
 */
export const AGENT_QUERY_RESULT_DEFINITION = {
  Icon: IconChartBar,
  label: msg`Result`,
  loadingLabel: msg`Loading result`,
  unavailableLabel: msg`Unavailable result`,
};
