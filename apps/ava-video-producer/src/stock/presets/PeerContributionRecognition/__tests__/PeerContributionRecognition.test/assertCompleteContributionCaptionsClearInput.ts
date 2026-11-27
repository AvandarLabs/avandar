import { assertCompleteContributionCaptionsClearForm as _assertCompleteContributionCaptionsClearForm } from "./assertCompleteContributionCaptionsClearForm";
import type {
  DEFAULT_INPUT,
  fixtures,
} from "../../PeerContributionRecognition.fixtures";

/**
 * Asserts complete contribution captions clear both acknowledgment
 * containers and their objects.
 */
export function assertCompleteContributionCaptionsClearInput(
  input: Readonly<
    | typeof DEFAULT_INPUT
    | NonNullable<typeof fixtures>[number]["input"]
    | (Omit<
        NonNullable<typeof fixtures>[number]["input"],
        "contributions" | "acknowledgment"
      > & {
        contributions: Array<
          Omit<
            NonNullable<
              typeof fixtures
            >[number]["input"]["contributions"][number],
            "label"
          > & { label: string }
        >;
        acknowledgment: Omit<
          NonNullable<typeof fixtures>[number]["input"]["acknowledgment"],
          "text"
        > & { text: string };
      })
  >,
): void {
  return ["spoken", "note"].forEach((form) => {
    return _assertCompleteContributionCaptionsClearForm({ form, input });
  });
}
