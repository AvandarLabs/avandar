import { type Input } from "../../PeerContributionRecognition.schema";
import { assertCompleteContributionCaptionsClearFrame as _assertCompleteContributionCaptionsClearFrame } from "./assertCompleteContributionCaptionsClearFrame";

/**
 * Asserts complete contribution captions clear both acknowledgment
 * containers and their objects.
 */
export function assertCompleteContributionCaptionsClearForm({
  form,
  input,
}: Readonly<{ form: string; input: Readonly<Input> }>): void {
  [96, 128, 150].forEach((frame) => {
    return _assertCompleteContributionCaptionsClearFrame({
      frame,
      input,
      form,
    });
  });
}
