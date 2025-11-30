import { Text } from "@react-email/components";
import { buildAppPageURL } from "$/utils/urls/buildAppPageURL.ts";
import { EmailFullButton } from "./lib/EmailFullButton.tsx";
import { EmailHeading } from "./lib/EmailHeading.tsx";
import { EmailParagraph } from "./lib/EmailParagraph.tsx";
import { EmailTemplate } from "./lib/EmailTemplate.tsx";

type Props = {
  signupCode: string;
  userEmail: string;
};

export function WaitlistSignupCodeEmail({
  signupCode,
  userEmail,
}: Props): JSX.Element {
  const registerURL = buildAppPageURL({
    path: "/register",
    queryParams: {
      email: userEmail,
      signupCode: signupCode,
    },
  });

  return (
    <EmailTemplate previewText="🎉 You're off the waitlist! Your signup code is ready">
      <EmailHeading order={1}>You're In!</EmailHeading>

      <EmailParagraph>
        Great news! You've made it off the waitlist and we're thrilled to have
        you join us.
      </EmailParagraph>

      <EmailParagraph>Your exclusive signup code is:</EmailParagraph>

      <Text style={styles.codeContainer}>
        <span style={styles.code}>{signupCode}</span>
      </Text>

      <EmailParagraph>
        Ready to get started? Click the button below to create your account and
        begin your journey with us!
      </EmailParagraph>

      <EmailFullButton href={registerURL}>Create Your Account</EmailFullButton>

      <Text style={styles.betaNotice}>
        <strong style={styles.betaNoticeTitle}>Beta Notice</strong>
        Avandar is still in beta so we appreciate your patience and feedback as
        we work to improve the product. Our goal is for Avandar to meet all of
        your mission's data needs, so please let us know of any features or
        changes we can make to help you.
      </Text>
    </EmailTemplate>
  );
}

const styles = {
  codeContainer: {
    textAlign: "center" as const,
    margin: "24px 0",
    padding: "16px",
    backgroundColor: "#f8f9fa",
    borderRadius: "4px",
    border: "2px solid #e9ecef",
  },
  code: {
    fontSize: "32px",
    fontWeight: "bold",
    letterSpacing: "4px",
    color: "#212529",
    fontFamily: "monospace",
  },
  betaNotice: {
    margin: "32px 0 0",
    padding: "20px",
    backgroundColor: "#fff3cd",
    borderRadius: "4px",
    border: "2px solid #ffc107",
    fontSize: "15px",
    lineHeight: "24px",
    color: "#856404",
  },
  betaNoticeTitle: {
    fontSize: "16px",
    fontWeight: "bold",
    display: "block",
    marginBottom: "8px",
    color: "#856404",
  },
};

export default WaitlistSignupCodeEmail;

WaitlistSignupCodeEmail.PreviewProps = {
  signupCode: "USER123ABC",
  userEmail: "user@avandarlabs.com",
} satisfies Props;
