import { defaultInput } from "../../PopulationNormalizedMap.fixtures";

/**
 * Makes fresh fixture state for count and rate equality remain distinct and
 * domains reject clipping.
 */
export function makeCountRateEqualityRemainValuesFromAuthoredValues(): Array<
  typeof defaultInput
> {
  return [
    {
      ...defaultInput,
      colorDomains: { countMaximum: 3, normalizedMaximum: 30 },
    },
    {
      ...defaultInput,
      colorDomains: { countMaximum: 4, normalizedMaximum: 29 },
    },
    {
      ...defaultInput,
      zones: defaultInput.zones.map((zone) => {
        return { ...zone, records: 100 };
      }),
    },
    {
      ...defaultInput,
      zones: [defaultInput.zones[0], { ...defaultInput.zones[0], id: "other" }],
    },
  ];
}
