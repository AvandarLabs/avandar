import { capitalize } from "$/lib/utils/strings/capitalize/capitalize";
import { EmailParagraph } from "./EmailParagraph";

type Props = {
  signOff?: "warmly";
  name: string;
  title?: string;
  appName: string;
};

export function EmailSignature({
  signOff = "warmly",
  name,
  title,
  appName,
}: Props): JSX.Element {
  return (
    <EmailParagraph>
      {capitalize(signOff)},
      <br />
      {name}
      {title ?
        <>
          <br />
          {title}
        </>
      : null}
      <br />
      {appName}
    </EmailParagraph>
  );
}
