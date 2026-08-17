/* eslint-disable @typescript-eslint/no-namespace */
import type {
  NuxMilestoneKey,
  NuxProgressId,
  NuxProgressRead,
  NuxStatus,
  NuxTutorialKey,
} from "$/models/Nux/NuxProgress.types.ts";

export namespace NuxProgress {
  export type T = NuxProgressRead;
  export type Id = NuxProgressId;
  export type Status = NuxStatus;
  export type MilestoneKey = NuxMilestoneKey;
  export type TutorialKey = NuxTutorialKey;
}
