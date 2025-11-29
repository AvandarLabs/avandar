import { capitalize } from "$/lib/utils/strings/capitalize/capitalize.ts";
import { EmailParagraph } from "./EmailParagraph.tsx";

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
