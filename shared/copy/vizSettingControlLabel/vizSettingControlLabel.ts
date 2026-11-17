import { t } from "@lingui/core/macro";

/**
 * Display labels for the viz setting controls, keyed by the untranslated label
 * the descriptor registries carry.
 *
 * The registries hold static English strings because a descriptor literal is
 * evaluated once at module load, which would freeze a translation for the
 * session. Those strings are therefore the stable message ids, and this map is
 * resolved at render time so labels follow the active locale.
 * `vizSettingControlLabel.test.ts` fails if a registry gains a label with no
 * entry here.
 */
function _labelMessages(): Record<string, string> {
  return {
    "100% stacked": t`100% stacked`,
    "Area layout": t`Area layout`,
    "Bar layout": t`Bar layout`,
    Bottom: t`Bottom`,
    Color: t`Color`,
    Curve: t`Curve`,
    "Fill opacity": t`Fill opacity`,
    "Gridline color": t`Gridline color`,
    Grouped: t`Grouped`,
    "Hide X axis": t`Hide X axis`,
    "Hide Y axis": t`Hide Y axis`,
    "Horizontal gridlines": t`Horizontal gridlines`,
    Left: t`Left`,
    "Legend position": t`Legend position`,
    "Line width": t`Line width`,
    Natural: t`Natural`,
    Overlapping: t`Overlapping`,
    Right: t`Right`,
    "Series label": t`Series label`,
    "Show dots": t`Show dots`,
    "Show legend": t`Show legend`,
    Smooth: t`Smooth`,
    "Split (+/-)": t`Split (+/-)`,
    "Stack group": t`Stack group`,
    Stacked: t`Stacked`,
    Step: t`Step`,
    Straight: t`Straight`,
    "Stroke width": t`Stroke width`,
    Top: t`Top`,
    "Vertical gridlines": t`Vertical gridlines`,
    "X axis label": t`X axis label`,
    "X axis label color": t`X axis label color`,
    "X axis label rotation": t`X axis label rotation`,
    "X axis maximum": t`X axis maximum`,
    "X axis minimum": t`X axis minimum`,
    "X axis tick color": t`X axis tick color`,
    "X axis tick interval": t`X axis tick interval`,
    "Y axis label": t`Y axis label`,
    "Y axis label color": t`Y axis label color`,
    "Y axis maximum": t`Y axis maximum`,
    "Y axis minimum": t`Y axis minimum`,
    "Y axis tick color": t`Y axis tick color`,
    "Y axis tick interval": t`Y axis tick interval`,
  };
}

/**
 * Returns the human-readable label for a viz setting control, falling back to
 * the registry's own string so an unmapped label still renders.
 */
export function vizSettingControlLabel(label: string): string {
  return _labelMessages()[label] ?? label;
}

/** The registry labels this module knows how to translate. */
export function knownVizSettingControlLabels(): readonly string[] {
  return Object.keys(_labelMessages());
}
