import { type Input } from "../ReleaseRepairObligations.schema";
import type { fixtures } from "../ReleaseRepairObligations.fixtures";
import type { render } from "./ReleaseRepairObligationsTestHelpers";

/** Inputs consumed by the corresponding rendered assertions. */

export type AssertOneOpenBlockerHoldsHeldOptions = {
  held: string;
  setup: string;
  deliveredMarkup: ReturnType<typeof render>;
  delivered: string;
  heldInput: NonNullable<typeof fixtures>[number]["input"];
};

/** Inputs consumed by the corresponding rendered assertions. */

export type AssertUnfoldingConnectorsContactVisiblePathOptions = {
  path: RegExpExecArray[][number][0];
  id: RegExpExecArray[][number][1];
  markup: ReturnType<typeof render>;
  issueMarks: string;
};

/** Inputs consumed by the corresponding rendered assertions. */

export type AssertUnfoldingConnectorsContactVisibleFrameOptions = {
  frame: number;
  input: Readonly<Input>;
  issueMarks: string;
  showResolvedIssues: boolean;
};
