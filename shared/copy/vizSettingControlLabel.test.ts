/**
 * Guards the viz setting label catalog against drift. The descriptor
 * registries hold untranslated labels as their stable message ids, so a new or
 * renamed label must gain a catalog entry or it renders untranslated in every
 * non-English locale.
 */
import { describe, expect, it } from "vitest";
import { knownVizSettingControlLabels } from "$/copy/vizSettingControlLabel.ts";
import { VizConfigs, VizTypes } from "$/models/vizs/VizConfig/VizConfigs.ts";

function collectRegistryLabels(): string[] {
  return VizTypes.flatMap((vizType) => {
    const descriptors = VizConfigs.getDescriptors(vizType);
    return [...descriptors.chart, ...descriptors.series].flatMap(
      (descriptor) => {
        const control = descriptor.control;
        const optionLabels =
          "options" in control ?
            control.options.map((option) => {
              return option.label;
            })
          : [];
        return [descriptor.label, ...optionLabels];
      },
    );
  });
}

describe("vizSettingControlLabel catalog", () => {
  it("covers every label the descriptor registries render", () => {
    const known = new Set(knownVizSettingControlLabels());
    const missing = Array.from(new Set(collectRegistryLabels())).filter(
      (label) => {
        return !known.has(label);
      },
    );

    expect(missing).toEqual([]);
  });

  it("has no catalog entry that no registry uses", () => {
    const registryLabels = new Set(collectRegistryLabels());
    const unused = knownVizSettingControlLabels().filter((label) => {
      return !registryLabels.has(label);
    });

    expect(unused).toEqual([]);
  });
});
