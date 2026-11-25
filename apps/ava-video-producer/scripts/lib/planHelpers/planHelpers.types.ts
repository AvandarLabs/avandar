/** Proof binds a preview to its exact source plan, assets and renderer. */
export type PlanFingerprint = {
  sourcePlanSha256: string;
  parsedPlanSha256: string;
  assets: Array<{ path: string; sha256: string }>;
  rendererSha256: string;
};
