import { Text } from "@react-email/components";
import { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export function EmailParagraph({ children }: Props): JSX.Element {
  return <Text style={styles.paragraph}>{children}</Text>;
}

const styles = {
  paragraph: {
    fontSize: "16px",
    lineHeight: "26px",
  },
};
