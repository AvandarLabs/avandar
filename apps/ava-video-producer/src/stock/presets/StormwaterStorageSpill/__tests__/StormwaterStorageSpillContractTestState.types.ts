import type { fixtures } from "../StormwaterStorageSpill.fixtures";
import type { REVIEW_FIXTURES } from "../StormwaterStorageSpill.reviewFixtures";
import type { _render } from "./StormwaterStorageSpillTestHelpers";

/** Inputs consumed by the corresponding rendered assertions. */

export type AssertPhysicalWaterDestinationItsCaptionOptions = {
  caption: RegExpMatchArray[number];
  color: RegExpMatchArray[number];
  physical: RegExpMatchArray[number];
  index: number;
  destination: string;
  markup: ReturnType<typeof _render>;
  supplied: Omit<
    (typeof fixtures)[number]["input"],
    "overflowSide" | "showBalance"
  > & { overflowSide: "left" | "right"; showBalance: boolean };
};

/** Inputs consumed by the corresponding rendered assertions. */

export type AssertPhysicalWaterDestinationItsPoolOwnedOptions = {
  pool: string | string | RegExpMatchArray[number];
  color: RegExpMatchArray[number];
  destination: string;
  physical: RegExpMatchArray[number];
  markup: ReturnType<typeof _render>;
  supplied: Omit<
    (typeof fixtures)[number]["input"],
    "overflowSide" | "showBalance"
  > & { overflowSide: "left" | "right"; showBalance: boolean };
};

/** Inputs consumed by the corresponding rendered assertions. */

export type AssertPhysicalWaterDestinationItsPoolPoolOptions = {
  pool: string | string | RegExpMatchArray[number];
  color: RegExpMatchArray[number];
  destination: string;
  physical: RegExpMatchArray[number];
};

/** Inputs consumed by the corresponding rendered assertions. */

export type AssertPhysicalWaterDestinationItsPoolOptions = {
  pool: string | string | RegExpMatchArray[number];
  color: RegExpMatchArray[number];
  destination: string;
  physical: RegExpMatchArray[number];
};

/** Inputs consumed by the corresponding rendered assertions. */

export type AssertWaterFractionsConserveInflowSpillCrestOptions = {
  spill: string;
  overflow: number;
  incoming: (typeof fixtures)[number]["input"]["event"]["incomingM3"];
  markup: ReturnType<typeof _render>;
  input: (typeof fixtures)[number]["input"];
  detained: number;
};

/** Inputs consumed by the corresponding rendered assertions. */

export type AssertWaterFractionsConserveInflowSpillOptions = {
  spill: string;
  overflow: number;
  incoming: (typeof fixtures)[number]["input"]["event"]["incomingM3"];
  markup: ReturnType<typeof _render>;
  input: (typeof fixtures)[number]["input"];
  detained: number;
};

/** Inputs consumed by the corresponding rendered assertions. */

export type AssertPhysicalWaterDestinationItsShowBalanceOptions = {
  showBalance: boolean;
  input: (typeof fixtures)[number]["input"];
  overflowSide: "left" | "right";
  id: ((typeof REVIEW_FIXTURES)[number] | (typeof fixtures)[number])["id"];
};
