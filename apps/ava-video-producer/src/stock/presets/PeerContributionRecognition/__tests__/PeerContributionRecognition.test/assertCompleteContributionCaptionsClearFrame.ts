import { PeerContributionRecognitionTestState } from "./PeerContributionRecognitionTestState";

const { markedShape: _markedShape, render } =
  PeerContributionRecognitionTestState;
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { type Input } from "../../PeerContributionRecognition.schema";
import { assertCompleteContributionCaptionsClearGroup as _assertCompleteContributionCaptionsClearGroup } from "./assertCompleteContributionCaptionsClearGroup";

/**
 * Asserts complete contribution captions clear both acknowledgment
 * containers and their objects.
 */
export function assertCompleteContributionCaptionsClearFrame({
  frame,
  input,
  form,
}: Readonly<{ frame: number; input: Readonly<Input>; form: string }>): void {
  const markup = render({
    frame: frame,
    input: {
      ...input,
      acknowledgment: {
        ...input.acknowledgment,
        form: form as Input["acknowledgment"]["form"],
      },
    },
  });
  const bubble = _markedShape({ markup, marker: "acknowledgment-box" });
  const bottom =
    SvgAttributes.getNumberFromMarkup({ attributes: bubble, name: "y" }) +
    SvgAttributes.getNumberFromMarkup({ attributes: bubble, name: "height" }) +
    0.5;
  [
    ...markup.matchAll(/<g data-contribution-caption="[^"]*">([\s\S]*?)<\/g>/g),
  ].forEach(([, group]) => {
    return _assertCompleteContributionCaptionsClearGroup({
      group,
      bottom,
      markup,
    });
  });
}
