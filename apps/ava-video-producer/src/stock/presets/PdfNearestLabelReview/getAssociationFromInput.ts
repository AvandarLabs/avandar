import type { Input } from "./PdfNearestLabelReview.schema";
/** Data for getAssociationFromInput. */
type GetAssociationFromInputResult = {
  distances: number[];
  ratio: number;
  isAmbiguous: boolean;
  chosenLabel: { id: string; text: string; x: number; y: number } | undefined;
};

/** Euclidean evidence retains authored order, even under ties and review. */
export function getAssociationFromInput(
  input: Readonly<Input>,
): GetAssociationFromInputResult {
  const distances = input.labels.map((label) =>
    Math.hypot(label.x - input.figure.x, label.y - input.figure.y),
  );
  const nearest = Math.min(...distances);
  const nextNearest = Math.max(...distances);
  const ratio = nearest / nextNearest;
  return {
    distances,
    ratio,
    isAmbiguous: ratio >= input.ambiguityThreshold,
    chosenLabel:
      input.reviewedLabelId === null
        ? undefined
        : input.labels.find(({ id }) => id === input.reviewedLabelId),
  };
}
