/** Inputs shared by the BatchFrame visuals. */
export type Props = {
  batchId: string;
  isComplete: boolean;
  x: number;
  y: number;
  width: number;
  frame: number;
  completeAt: number;
  accent: string;
};
