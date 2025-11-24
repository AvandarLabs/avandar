import {
  Body,
  Container,
  Head,
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

const logoWidth = LOGO.originalWidth * LOGO.scaleForEmail;
const logoHeight = LOGO.originalHeight * LOGO.scaleForEmail;

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
