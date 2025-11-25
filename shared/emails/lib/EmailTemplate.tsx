import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Preview,
  Section,
} from "@react-email/components";
import { ReactNode } from "react";
import { APP_NAME } from "@/config/AppConfig";
import { LOGO, THEME } from "./EmailTheme";
import { getRelativeImageURL } from "./getRelativeImageURL";

type Props = {
  children: ReactNode;
  previewText: string;
};

// the logo's scale factor to render it in the email header
const LOGO_SCALE = 0.2;
const logoWidth = LOGO.originalWidth * LOGO_SCALE;
const logoHeight = LOGO.originalHeight * LOGO_SCALE;

export function EmailTemplate({ children, previewText }: Props): JSX.Element {
  return (
    <Html>
      <Head />
      <Body style={styles.main}>
        <Preview>{previewText}</Preview>
        <Container style={styles.container}>
          <Section style={styles.header}>
            <Img
              src={getRelativeImageURL("logoAndName.png")}
              alt={`${APP_NAME} logo`}
              style={styles.logo}
              width={logoWidth}
              height={logoHeight}
            />
            <Hr />
          </Section>
          <Section style={styles.content}>{children}</Section>
        </Container>
      </Body>
    </Html>
  );
}

const styles = {
  main: {
    backgroundColor: THEME.bodyBackgroundColor,
    fontFamily:
      "-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Oxygen-Sans,Ubuntu,Cantarell,Helvetica Neue,sans-serif",
    margin: 0,
  },

  container: {
    width: "100%",
    maxWidth: "680px",
    margin: "0 auto",
    padding: "20px 10px",
  },

  header: {
    paddingTop: "12px",
    borderRadius: "5px 5px 0 0",
    backgroundColor: THEME.contentBackgroundColor,
  },

  content: {
    padding: "4px 20px 20px",
    backgroundColor: THEME.contentBackgroundColor,
  },

  logo: {
    margin: "0 auto",
    maxWidth: "100%",
  },

  footer: {
    maxWidth: "100%",
    margin: "32px auto 0 auto",
    padding: "0 20px",
  },

  footerText: {
    fontSize: "12px",
    lineHeight: "15px",
    color: THEME.footerTextColor,
    margin: "0",
    marginBottom: "4px",
  },
};
