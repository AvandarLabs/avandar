import { Button } from "@react-email/components";
import { ReactNode } from "react";
import { PRIMARY_COLOR } from "@/config/Theme";
import { getRelativeURL } from "./getRelativeURL";

type Props = {
  children: ReactNode;
  href?: string;
  relativeHREF?: string;
};

export function EmailFullButton({
  children,
  href,
  relativeHREF,
}: Props): JSX.Element {
  return (
    <Button
      href={href ?? getRelativeURL(relativeHREF ?? "")}
      style={styles.button}
    >
      <div style={styles.content}>{children}</div>
    </Button>
  );
}

const styles = {
  button: {
    width: "100%",
    maxWidth: "100%",
    backgroundColor: PRIMARY_COLOR,
    borderRadius: "3px",
    color: "#ffffff",
    fontSize: "16px",
    textDecoration: "none",
    textAlign: "center" as const,
    display: "block",
  },

  content: {
    padding: "12px",
  },
};
